#include "pch.h"
#include "Screenshotter.h"
#include <iostream>
#include <string>
#include <vector>
#include <filesystem>
#include <algorithm>
#include <utility>
#include <thread>   // <-- 新增: 用于多线程
#include <atomic>   // <-- 新增: 用于线程安全的计数器

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/imgutils.h>
#include <libswscale/swscale.h>
#include <libavutil/opt.h>
#include <libavutil/log.h>
#include <libavutil/time.h>
}

// 内部辅助函数 (无变化)
static int save_frame_as_webp(AVFrame* frame, const char* out_path)
{
  fprintf(stderr, "DEBUG: enter save_frame_as_webp, frame fmt=%d, wxh=%dx%d\n",
    frame->format, frame->width, frame->height);

  const AVCodec* webp_codec = avcodec_find_encoder(AV_CODEC_ID_WEBP);
  if (!webp_codec) {
    fprintf(stderr, "Could not find WEBP encoder.\n");
    return -1;
  }

  AVCodecContext* codec_ctx = avcodec_alloc_context3(webp_codec);
  if (!codec_ctx) {
    fprintf(stderr, "Could not allocate WEBP codec context.\n");
    return -1;
  }

  codec_ctx->width = frame->width;
  codec_ctx->height = frame->height;
  codec_ctx->pix_fmt = AV_PIX_FMT_YUV420P;
  codec_ctx->time_base = { 1,25 };
  codec_ctx->framerate = { 25,1 };

  av_opt_set_int(codec_ctx->priv_data, "lossless", 0, 0);
  av_opt_set(codec_ctx->priv_data, "quality", "100", 0);

  if (avcodec_open2(codec_ctx, webp_codec, NULL) < 0) {
    fprintf(stderr, "Could not open WEBP codec.\n");
    avcodec_free_context(&codec_ctx);
    return -1;
  }

  SwsContext* sws_ctx = sws_getContext(
    frame->width, frame->height, (AVPixelFormat)frame->format,
    codec_ctx->width, codec_ctx->height, codec_ctx->pix_fmt,
    SWS_BILINEAR, NULL, NULL, NULL);
  if (!sws_ctx) {
    fprintf(stderr, "Could not initialize SwsContext\n");
    avcodec_free_context(&codec_ctx);
    return -1;
  }

  AVFrame* frame_for_webp = av_frame_alloc();
  frame_for_webp->format = codec_ctx->pix_fmt;
  frame_for_webp->width = codec_ctx->width;
  frame_for_webp->height = codec_ctx->height;
  if (av_image_alloc(frame_for_webp->data, frame_for_webp->linesize,
    frame_for_webp->width, frame_for_webp->height,
    codec_ctx->pix_fmt, 32) < 0) {
    fprintf(stderr, "av_image_alloc failed\n");
    av_frame_free(&frame_for_webp);
    sws_freeContext(sws_ctx);
    avcodec_free_context(&codec_ctx);
    return -1;
  }

  sws_scale(sws_ctx,
    (const uint8_t* const*)frame->data, frame->linesize, 0, frame->height,
    frame_for_webp->data, frame_for_webp->linesize);

  AVPacket* packet = av_packet_alloc();
  int ret = avcodec_send_frame(codec_ctx, frame_for_webp);
  if (ret < 0) {
    fprintf(stderr, "avcodec_send_frame failed, ret=%d\n", ret);
    av_packet_free(&packet);
    av_freep(&frame_for_webp->data[0]);
    av_frame_free(&frame_for_webp);
    sws_freeContext(sws_ctx);
    avcodec_free_context(&codec_ctx);
    return -1;
  }

  ret = avcodec_send_frame(codec_ctx, NULL);
  if (ret < 0) {
    fprintf(stderr, "avcodec_send_frame(NULL) failed, ret=%d\n", ret);
    av_packet_free(&packet);
    av_freep(&frame_for_webp->data[0]);
    av_frame_free(&frame_for_webp);
    sws_freeContext(sws_ctx);
    avcodec_free_context(&codec_ctx);
    return -1;
  }

  ret = avcodec_receive_packet(codec_ctx, packet);
  if (ret < 0) {
    fprintf(stderr, "avcodec_receive_packet failed after flush, ret=%d\n", ret);
    av_packet_free(&packet);
    av_freep(&frame_for_webp->data[0]);
    av_frame_free(&frame_for_webp);
    sws_freeContext(sws_ctx);
    avcodec_free_context(&codec_ctx);
    return -1;
  }

  FILE* f = fopen(out_path, "wb");
  if (!f) {
    fprintf(stderr, "Could not open output file: %s\n", out_path);
    av_packet_free(&packet);
    av_freep(&frame_for_webp->data[0]);
    av_frame_free(&frame_for_webp);
    sws_freeContext(sws_ctx);
    avcodec_free_context(&codec_ctx);
    return -1;
  }
  size_t w = fwrite(packet->data, 1, packet->size, f);
  fclose(f);
  if (w != packet->size) {
    fprintf(stderr, "fwrite failed: %zu / %d bytes\n", w, packet->size);
    av_packet_free(&packet);
    av_freep(&frame_for_webp->data[0]);
    av_frame_free(&frame_for_webp);
    sws_freeContext(sws_ctx);
    avcodec_free_context(&codec_ctx);
    return -1;
  }

  fprintf(stderr, "DEBUG: WebP saved to %s, %d bytes\n", out_path, packet->size);
  av_packet_free(&packet);
  av_freep(&frame_for_webp->data[0]);
  av_frame_free(&frame_for_webp);
  sws_freeContext(sws_ctx);
  avcodec_free_context(&codec_ctx);
  return 0;
}

// 单张截图函数 (无变化)
DLLEXPORT int generate_screenshot(const char* video_path, long long timestamp_ms, const char* output_path) {
  av_log_set_level(AV_LOG_VERBOSE);

  AVFormatContext* format_ctx = nullptr;
  const AVCodec* decoder = nullptr;
  AVCodecContext* codec_ctx_dec = nullptr;
  AVStream* video_stream = nullptr;
  AVFrame* frame = nullptr;
  AVPacket* packet = nullptr;
  int64_t seek_timestamp = 0;
  int video_stream_index = -1;
  int ret = -1;

  if (avformat_open_input(&format_ctx, video_path, NULL, NULL) != 0) {
    fprintf(stderr, "Error: Could not open video file: %s\n", video_path);
    return -1;
  }
  if (avformat_find_stream_info(format_ctx, NULL) < 0) {
    fprintf(stderr, "Error: Could not find stream information.\n");
    avformat_close_input(&format_ctx);
    return -1;
  }

  video_stream_index = av_find_best_stream(format_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, &decoder, 0);
  if (video_stream_index < 0) {
    fprintf(stderr, "Error: Could not find a video stream in the input file.\n");
    goto cleanup;
  }

  video_stream = format_ctx->streams[video_stream_index];

  codec_ctx_dec = avcodec_alloc_context3(decoder);
  avcodec_parameters_to_context(codec_ctx_dec, video_stream->codecpar);
  if (avcodec_open2(codec_ctx_dec, decoder, NULL) < 0) {
    fprintf(stderr, "Error: Could not open codec.\n");
    goto cleanup;
  }

  seek_timestamp = av_rescale(timestamp_ms, video_stream->time_base.den, (int64_t)video_stream->time_base.num * 1000);

  if (av_seek_frame(format_ctx, video_stream_index, seek_timestamp, AVSEEK_FLAG_BACKWARD) < 0) {
    fprintf(stderr, "Error: Could not seek to timestamp %lldms\n", timestamp_ms);
    goto cleanup;
  }
  avcodec_flush_buffers(codec_ctx_dec);

  frame = av_frame_alloc();
  packet = av_packet_alloc();

  while (av_read_frame(format_ctx, packet) >= 0) {
    if (packet->stream_index == video_stream_index) {
      if (avcodec_send_packet(codec_ctx_dec, packet) == 0) {
        while (avcodec_receive_frame(codec_ctx_dec, frame) == 0) {
          int64_t frame_ts_ms = av_rescale_q(frame->pts, video_stream->time_base, { 1, 1000 });
          if (frame_ts_ms >= timestamp_ms) {
            printf("Found frame at timestamp %lld ms (target was %lld ms). Saving...\n", frame_ts_ms, timestamp_ms);
            if (save_frame_as_webp(frame, output_path) == 0) {
              ret = 0;
            }
            else {
              fprintf(stderr, "Error: Failed to save frame as WebP.\n");
              ret = -1;
            }
            goto end_loop;
          }
        }
      }
    }
    av_packet_unref(packet);
  }

end_loop:
cleanup:
  av_packet_free(&packet);
  av_frame_free(&frame);
  avcodec_free_context(&codec_ctx_dec);
  avformat_close_input(&format_ctx);

  if (ret != 0) {
    fprintf(stderr, "Function generate_screenshot failed to produce an image.\n");
  }

  return ret;
}


struct ScreenshotRequest {
  long long timestamp_ms;
  std::string output_path;

  // 虽然你的代码中已经移除了排序，但保留这个比较运算符是个好习惯，
  // 以便未来需要排序时可以直接使用 std::sort。
  bool operator<(const ScreenshotRequest& other) const {
    return timestamp_ms < other.timestamp_ms;
  }
};


/**
 * @brief 为单个视频文件在多个时间点生成截图（高效串行处理）。
 * @warning 调用者必须保证 `timestamps_ms` 数组已经按升序排列！
 *
 * @param video_path 输入视频文件的路径。
 * @param timestamps_ms 需要截图的时间点（毫秒）数组，必须是已排序的。
 * @param count 时间戳的数量。
 * @param output_path_template 输出文件名的模板，"%ms" 会被替换为时间戳。
 * @return 成功生成截图的数量。
 */
DLLEXPORT int generate_screenshots_for_video(const char* video_path, const long long* timestamps_ms, int count, const char* output_path_template) {
  if (count <= 0) {
    return 0;
  }

  av_log_set_level(AV_LOG_VERBOSE);

  // --- 1. 一次性初始化所有 FFmpeg 相关上下文 ---
  AVFormatContext* format_ctx = nullptr;
  const AVCodec* decoder = nullptr;
  AVCodecContext* codec_ctx_dec = nullptr;
  AVStream* video_stream = nullptr;
  AVFrame* frame = nullptr;
  AVPacket* packet = nullptr;
  int video_stream_index = -1;
  int success_count = 0;

  if (avformat_open_input(&format_ctx, video_path, NULL, NULL) != 0) {
    // ... (错误处理代码无变化)
    return 0;
  }
  if (avformat_find_stream_info(format_ctx, NULL) < 0) {
    // ... (错误处理代码无变化)
    avformat_close_input(&format_ctx);
    return 0;
  }
  video_stream_index = av_find_best_stream(format_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, &decoder, 0);
  if (video_stream_index < 0) {
    // ... (错误处理代码无变化)
    avformat_close_input(&format_ctx);
    return 0;
  }
  video_stream = format_ctx->streams[video_stream_index];
  codec_ctx_dec = avcodec_alloc_context3(decoder);
  avcodec_parameters_to_context(codec_ctx_dec, video_stream->codecpar);
  if (avcodec_open2(codec_ctx_dec, decoder, NULL) < 0) {
    // ... (错误处理代码无变化)
    avcodec_free_context(&codec_ctx_dec);
    avformat_close_input(&format_ctx);
    return 0;
  }

  frame = av_frame_alloc();
  packet = av_packet_alloc();
  if (!frame || !packet) {
    // ... (错误处理代码无变化)
    av_frame_free(&frame);
    av_packet_free(&packet);
    avcodec_free_context(&codec_ctx_dec);
    avformat_close_input(&format_ctx);
    return 0;
  }

  // --- 2. 创建截图请求列表 (不再排序) ---
  // 注意：函数现在依赖于调用者提供的 timestamps_ms 数组是预先排序好的。
  std::vector<ScreenshotRequest> requests;
  std::string template_str(output_path_template);
  for (int i = 0; i < count; ++i) {
    std::string final_path = template_str;
    size_t pos = final_path.find("%ms");
    if (pos != std::string::npos) {
      final_path.replace(pos, 3, std::to_string(timestamps_ms[i]));
    }
    requests.push_back({ timestamps_ms[i], final_path });
  }
  // std::sort(requests.begin(), requests.end()); // <-- 此行已根据您的要求移除

  // --- 3. 循环处理所有请求 ---
  for (const auto& req : requests) {
    int64_t seek_timestamp = av_rescale(req.timestamp_ms, video_stream->time_base.den, (int64_t)video_stream->time_base.num * 1000);

    if (av_seek_frame(format_ctx, video_stream_index, seek_timestamp, AVSEEK_FLAG_BACKWARD) < 0) {
      fprintf(stderr, "Error: Could not seek to timestamp %lldms. Skipping.\n", req.timestamp_ms);
      continue;
    }
    avcodec_flush_buffers(codec_ctx_dec);

    bool frame_saved = false;
    while (av_read_frame(format_ctx, packet) >= 0) {
      if (packet->stream_index == video_stream_index) {
        if (avcodec_send_packet(codec_ctx_dec, packet) == 0) {
          while (avcodec_receive_frame(codec_ctx_dec, frame) == 0) {
            int64_t frame_ts_ms = av_rescale_q(frame->pts, video_stream->time_base, { 1, 1000 });
            if (frame_ts_ms >= req.timestamp_ms) {
              printf("Found frame for %lld ms at timestamp %lld ms. Saving to %s...\n", req.timestamp_ms, frame_ts_ms, req.output_path.c_str());
              if (save_frame_as_webp(frame, req.output_path.c_str()) == 0) {
                success_count++;
              }
              else {
                fprintf(stderr, "Error: Failed to save frame for timestamp %lldms.\n", req.timestamp_ms);
              }
              frame_saved = true;
              goto next_request;
            }
          }
        }
      }
      av_packet_unref(packet);
    }
  next_request:;
  }

  // --- 4. 一次性清理 ---
  av_packet_free(&packet);
  av_frame_free(&frame);
  avcodec_free_context(&codec_ctx_dec);
  avformat_close_input(&format_ctx);

  return success_count;
}


/**
 * @brief 为多个不同的视频文件在同一时间点生成截图（并行处理）。
 *
 * @param video_paths 输入视频文件的路径数组。
 * @param output_paths 与视频路径一一对应的输出 WebP 文件的路径数组。
 * @param count 视频文件的数量（即数组的大小）。
 * @param timestamp_ms 需要截图的时间点（毫秒）。
 * @return 成功生成截图的数量。
 */
DLLEXPORT int generate_screenshots_for_videos(const char* const* video_paths, const char* const* output_paths, int count, long long timestamp_ms) {
  if (count <= 0) {
    return 0;
  }

  // 1. 准备多线程环境
  std::atomic<int> success_count(0); // 使用原子变量确保线程安全
  std::vector<std::thread> threads;

  // 建议的并发线程数，避免创建过多线程。
  // 使用 hardware_concurrency 可以获取CPU核心数，但简单起见，这里直接处理所有任务。
  // 对于IO密集型任务，线程数可以多于核心数。

  // 2. 为每个视频启动一个处理线程
  for (int i = 0; i < count; ++i) {
    // 使用 emplace_back 直接在 vector 中构造线程对象
    threads.emplace_back([&success_count, video_path = video_paths[i], output_path = output_paths[i], timestamp_ms]() {
      // 每个线程调用独立的单文件截图函数
      // 这是一个独立的、无共享状态（除了原子计数器）的任务
      if (generate_screenshot(video_path, timestamp_ms, output_path) == 0) {
        success_count++; // 原子操作，线程安全
      }
    });
  }

  // 3. 等待所有线程执行完毕
  for (auto& t : threads) {
    if (t.joinable()) {
      t.join();
    }
  }

  // 4. 返回成功计数
  return success_count.load();
}
