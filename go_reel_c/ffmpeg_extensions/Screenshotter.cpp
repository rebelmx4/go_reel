// --- START OF FILE Screenshotter.cpp ---

#include "pch.h" 
#include "Screenshotter.h"
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <filesystem>
#include <future>
#include <deque>
#include <thread>
#include <chrono>
#include <cstring> // for strrchr, _stricmp

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/imgutils.h>
#include <libswscale/swscale.h>
#include <libavutil/opt.h>
#include <libavutil/log.h>
#include <libavutil/time.h>
}

using namespace std::chrono_literals;

// =================================================================
// 内部工具：简单的字符串不区分大小写比较 (跨平台兼容)
// =================================================================
static bool ends_with_ignore_case(const char* str, const char* suffix) {
  if (!str || !suffix) return false;
  size_t len_str = strlen(str);
  size_t len_suffix = strlen(suffix);
  if (len_suffix > len_str) return false;

  const char* ptr_str = str + len_str - len_suffix;
#ifdef _WIN32
  return _stricmp(ptr_str, suffix) == 0;
#else
  return strcasecmp(ptr_str, suffix) == 0;
#endif
}

// =================================================================
// 1. [重构] 内部核心函数：通用帧保存 (支持 WebP, PNG, JPG)
//    根据 out_path 的后缀自动选择编码器
// =================================================================
static int save_frame_internal(const AVFrame* frame, const char* out_path)
{
  int ret = 0;

  // 1. 根据后缀确定编码器 ID 和像素格式
  AVCodecID codec_id = AV_CODEC_ID_WEBP; // 默认
  AVPixelFormat target_pix_fmt = AV_PIX_FMT_YUV420P; // 默认

  if (ends_with_ignore_case(out_path, ".png")) {
    codec_id = AV_CODEC_ID_PNG;
    target_pix_fmt = AV_PIX_FMT_RGB24; // PNG 通常用 RGB24 或 RGBA
  }
  else if (ends_with_ignore_case(out_path, ".jpg") || ends_with_ignore_case(out_path, ".jpeg")) {
    codec_id = AV_CODEC_ID_MJPEG;
    target_pix_fmt = AV_PIX_FMT_YUVJ420P; // JPEG 使用 YUVJ420P (全范围) 或 YUV420P
  }
  // else .webp

  const AVCodec* codec = avcodec_find_encoder(codec_id);
  if (!codec) {
    fprintf(stderr, "[Error] Encoder not found for output file.\n");
    return -1;
  }

  AVCodecContext* codec_ctx = avcodec_alloc_context3(codec);
  if (!codec_ctx) return -1;

  // --- 编码参数配置 ---
  codec_ctx->width = frame->width;
  codec_ctx->height = frame->height;
  codec_ctx->pix_fmt = target_pix_fmt;
  codec_ctx->time_base = { 1, 25 };
  codec_ctx->framerate = { 25, 1 };

  // 针对不同格式的特定参数
  if (codec_id == AV_CODEC_ID_WEBP) {
    av_opt_set_int(codec_ctx->priv_data, "lossless", 0, 0); // 0=有损
    av_opt_set(codec_ctx->priv_data, "quality", "80", 0);
    av_opt_set_int(codec_ctx->priv_data, "compression_level", 4, 0);
  }
  else if (codec_id == AV_CODEC_ID_MJPEG) {
    // JPEG 质量范围 2-31 (越小越好)，或者用 qscale
    // FFmpeg 中 global_quality 通常对应 lambda * FF_QP2LAMBDA
    // 为了简单，我们尝试用 qmin/qmax 或者直接设置 bit_rate (不推荐)
    // 使用 av_opt_set "q" 或者 codec_ctx->flags
    // 这里简单设置 color range 以防灰度偏色
    if (target_pix_fmt == AV_PIX_FMT_YUVJ420P) {
      codec_ctx->color_range = AVCOL_RANGE_JPEG;
    }
    // 设置 JPEG 质量 (相当于 -q:v 3 左右，范围 1-31，1最好)
    // 注意：API 控制 MJPEG 质量比较麻烦，这里作为示例使用默认
  }
  else if (codec_id == AV_CODEC_ID_PNG) {
    // PNG 压缩级别 0-9
    av_opt_set_int(codec_ctx->priv_data, "compression_level", 7, 0);
  }

  if (avcodec_open2(codec_ctx, codec, NULL) < 0) {
    fprintf(stderr, "[Error] Could not open codec.\n");
    avcodec_free_context(&codec_ctx);
    return -1;
  }

  // --- 图像格式转换 (源格式 -> 目标格式) ---
  // 即使源格式和目标格式一样，为了处理 linesize 对齐或数据拷贝，使用 sws_scale 也是最稳妥的
  SwsContext* sws_ctx = sws_getContext(
    frame->width, frame->height, (AVPixelFormat)frame->format,
    codec_ctx->width, codec_ctx->height, codec_ctx->pix_fmt,
    SWS_BILINEAR, NULL, NULL, NULL);

  if (!sws_ctx) {
    avcodec_free_context(&codec_ctx);
    return -1;
  }

  AVFrame* frame_converted = av_frame_alloc();
  frame_converted->format = codec_ctx->pix_fmt;
  frame_converted->width = codec_ctx->width;
  frame_converted->height = codec_ctx->height;

  if (av_image_alloc(frame_converted->data, frame_converted->linesize,
    frame_converted->width, frame_converted->height,
    codec_ctx->pix_fmt, 32) < 0) {
    av_frame_free(&frame_converted);
    sws_freeContext(sws_ctx);
    avcodec_free_context(&codec_ctx);
    return -1;
  }

  sws_scale(sws_ctx,
    (const uint8_t* const*)frame->data, frame->linesize, 0, frame->height,
    frame_converted->data, frame_converted->linesize);

  // --- 编码与写入 ---
  AVPacket* packet = av_packet_alloc();
  ret = avcodec_send_frame(codec_ctx, frame_converted);
  if (ret >= 0) {
    avcodec_send_frame(codec_ctx, NULL); // Flush encoder
    ret = avcodec_receive_packet(codec_ctx, packet);
    if (ret >= 0) {
      FILE* f = fopen(out_path, "wb");
      if (f) {
        fwrite(packet->data, 1, packet->size, f);
        fclose(f);
        ret = 0; // Success
      }
      else {
        fprintf(stderr, "[Error] Could not open output file: %s\n", out_path);
        ret = -1;
      }
    }
  }

  // --- 资源清理 ---
  av_packet_free(&packet);
  av_freep(&frame_converted->data[0]);
  av_frame_free(&frame_converted);
  sws_freeContext(sws_ctx);
  avcodec_free_context(&codec_ctx);

  return ret;
}


// =================================================================
// 2. [新增功能] 获取视频时长 (毫秒)
// =================================================================
DLLEXPORT long long get_video_duration(const char* video_path) {
  AVFormatContext* format_ctx = nullptr;
  // 抑制日志
  av_log_set_level(AV_LOG_ERROR);

  if (avformat_open_input(&format_ctx, video_path, NULL, NULL) != 0) {
    return -1;
  }

  // 必须调用这个才能获取准确时长
  if (avformat_find_stream_info(format_ctx, NULL) < 0) {
    avformat_close_input(&format_ctx);
    return -1;
  }

  long long duration_ms = 0;
  if (format_ctx->duration != AV_NOPTS_VALUE) {
    // format_ctx->duration 单位是 AV_TIME_BASE (微秒)
    // 转换为毫秒: duration / 1000
    duration_ms = format_ctx->duration / 1000;
  }

  avformat_close_input(&format_ctx);
  return duration_ms;
}


// =================================================================
// 3. [核心功能] 单视频批量截图 (已更新：调用 save_frame_internal)
// =================================================================
DLLEXPORT int generate_screenshots_for_video(const char* video_path, const long long* timestamps_ms, int count, const char* output_path_template) {
  if (count <= 0) return 0;

  std::vector<long long> sorted_timestamps(timestamps_ms, timestamps_ms + count);
  std::sort(sorted_timestamps.begin(), sorted_timestamps.end());
  sorted_timestamps.erase(std::unique(sorted_timestamps.begin(), sorted_timestamps.end()), sorted_timestamps.end());

  av_log_set_level(AV_LOG_ERROR);

  unsigned int max_concurrent = std::thread::hardware_concurrency();
  if (max_concurrent == 0) max_concurrent = 4;
  std::deque<std::future<int>> tasks;

  int success_count = 0;

  AVFormatContext* format_ctx = nullptr;
  if (avformat_open_input(&format_ctx, video_path, NULL, NULL) != 0) {
    return -1;
  }

  if (avformat_find_stream_info(format_ctx, NULL) < 0) {
    avformat_close_input(&format_ctx);
    return -1;
  }

  const AVCodec* decoder = nullptr;
  int video_stream_index = av_find_best_stream(format_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, &decoder, 0);
  if (video_stream_index < 0) {
    avformat_close_input(&format_ctx);
    return -1;
  }

  AVStream* video_stream = format_ctx->streams[video_stream_index];
  AVCodecContext* codec_ctx_dec = avcodec_alloc_context3(decoder);
  avcodec_parameters_to_context(codec_ctx_dec, video_stream->codecpar);
  codec_ctx_dec->thread_count = 0;

  if (avcodec_open2(codec_ctx_dec, decoder, NULL) < 0) {
    avcodec_free_context(&codec_ctx_dec);
    avformat_close_input(&format_ctx);
    return -1;
  }

  AVFrame* frame = av_frame_alloc();
  AVPacket* packet = av_packet_alloc();

  for (long long target_ms : sorted_timestamps) {
    std::string final_path = output_path_template;
    size_t pos = final_path.find("%ms");
    if (pos != std::string::npos) {
      final_path.replace(pos, 3, std::to_string(target_ms));
    }
    else {
      final_path += "_" + std::to_string(target_ms);
    }

    int64_t seek_target = av_rescale(target_ms, video_stream->time_base.den, (int64_t)video_stream->time_base.num * 1000);

    if (av_seek_frame(format_ctx, video_stream_index, seek_target, AVSEEK_FLAG_BACKWARD) < 0) {
      continue;
    }

    avcodec_flush_buffers(codec_ctx_dec);

    while (av_read_frame(format_ctx, packet) >= 0) {
      if (packet->stream_index == video_stream_index) {
        if (avcodec_send_packet(codec_ctx_dec, packet) == 0) {
          while (avcodec_receive_frame(codec_ctx_dec, frame) == 0) {
            int64_t frame_ts_ms = av_rescale_q(frame->pts, video_stream->time_base, { 1, 1000 });

            if (frame_ts_ms >= target_ms) {
              AVFrame* frame_clone = av_frame_clone(frame);
              if (!frame_clone) break;

              for (auto it = tasks.begin(); it != tasks.end(); ) {
                if (it->wait_for(0s) == std::future_status::ready) {
                  if (it->get() == 0) success_count++;
                  it = tasks.erase(it);
                }
                else {
                  ++it;
                }
              }

              if (tasks.size() >= max_concurrent) {
                if (tasks.front().get() == 0) success_count++;
                tasks.pop_front();
              }

              tasks.push_back(std::async(std::launch::async, [frame_clone, final_path]() {
                // [修改] 调用新的内部函数，支持多种格式
                int res = save_frame_internal(frame_clone, final_path.c_str());
                AVFrame* to_free = frame_clone;
                av_frame_free(&to_free);
                return res;
                }));

              goto next_timestamp_label;
            }
          }
        }
      }
      av_packet_unref(packet);
    }
  next_timestamp_label:
    av_packet_unref(packet);
  }

  for (auto& task : tasks) {
    if (task.get() == 0) success_count++;
  }

  av_packet_free(&packet);
  av_frame_free(&frame);
  avcodec_free_context(&codec_ctx_dec);
  avformat_close_input(&format_ctx);

  return success_count;
}


// =================================================================
// 4. [修改] 多视频处理 (适配 save_frame_internal 的变化)
// =================================================================
DLLEXPORT int generate_screenshots_for_videos(const char* const* video_paths, int count, long long timestamp_ms, const char* output_dir) {
  int total_success = 0;
  unsigned int max_concurrent = std::thread::hardware_concurrency();
  if (max_concurrent == 0) max_concurrent = 4;

  std::deque<std::future<int>> file_tasks;

  for (int i = 0; i < count; ++i) {
    for (auto it = file_tasks.begin(); it != file_tasks.end(); ) {
      if (it->wait_for(0s) == std::future_status::ready) {
        if (it->get() == 0) total_success++;
        it = file_tasks.erase(it);
      }
      else {
        ++it;
      }
    }

    if (file_tasks.size() >= max_concurrent) {
      if (file_tasks.front().get() == 0) total_success++;
      file_tasks.pop_front();
    }

    std::string v_path = video_paths[i];
    std::string o_dir = output_dir;

    file_tasks.push_back(std::async(std::launch::async, [v_path, o_dir, timestamp_ms]() {
      std::filesystem::path video_p(v_path);
      // 默认保存为 webp，如果需要其他格式，可以在这里修改逻辑或者传入参数
      std::string output_filename = video_p.stem().string() + ".webp";
      std::filesystem::path final_path = std::filesystem::path(o_dir) / output_filename;

      return generate_screenshot(v_path.c_str(), timestamp_ms, final_path.string().c_str());
      }));
  }

  for (auto& t : file_tasks) {
    if (t.get() == 0) total_success++;
  }

  return total_success;
}


// =================================================================
// 5. [修改] 单张截图 (适配 save_frame_internal)
// =================================================================
DLLEXPORT int generate_screenshot(const char* video_path, long long timestamp_ms, const char* output_path) {
  int ret = -1;
  AVFormatContext* format_ctx = nullptr;
  const AVCodec* decoder = nullptr;
  AVCodecContext* codec_ctx = nullptr;
  AVFrame* frame = nullptr;
  AVPacket* packet = nullptr;
  int stream_idx = -1;
  int64_t seek_target = 0;

  // 抑制日志
  av_log_set_level(AV_LOG_ERROR);

  if (avformat_open_input(&format_ctx, video_path, NULL, NULL) != 0) goto cleanup;
  if (avformat_find_stream_info(format_ctx, NULL) < 0) goto cleanup;

  stream_idx = av_find_best_stream(format_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, &decoder, 0);
  if (stream_idx < 0) goto cleanup;

  codec_ctx = avcodec_alloc_context3(decoder);
  if (!codec_ctx) goto cleanup;
  avcodec_parameters_to_context(codec_ctx, format_ctx->streams[stream_idx]->codecpar);

  if (avcodec_open2(codec_ctx, decoder, NULL) < 0) goto cleanup;

  seek_target = av_rescale(timestamp_ms, format_ctx->streams[stream_idx]->time_base.den, (int64_t)format_ctx->streams[stream_idx]->time_base.num * 1000);

  if (av_seek_frame(format_ctx, stream_idx, seek_target, AVSEEK_FLAG_BACKWARD) < 0) goto cleanup;

  avcodec_flush_buffers(codec_ctx);

  frame = av_frame_alloc();
  packet = av_packet_alloc();
  if (!frame || !packet) goto cleanup;

  while (av_read_frame(format_ctx, packet) >= 0) {
    if (packet->stream_index == stream_idx) {
      if (avcodec_send_packet(codec_ctx, packet) == 0) {
        while (avcodec_receive_frame(codec_ctx, frame) == 0) {
          int64_t pts = av_rescale_q(frame->pts, format_ctx->streams[stream_idx]->time_base, { 1, 1000 });
          if (pts >= timestamp_ms) {
            // [修改] 调用通用保存函数
            ret = save_frame_internal(frame, output_path);
            goto cleanup;
          }
        }
      }
    }
    av_packet_unref(packet);
  }

cleanup:
  if (packet) av_packet_free(&packet);
  if (frame) av_frame_free(&frame);
  if (codec_ctx) avcodec_free_context(&codec_ctx);
  if (format_ctx) avformat_close_input(&format_ctx);
  return ret;
}

// =================================================================
// 6. [新增功能] 百分比截图
// =================================================================
DLLEXPORT int generate_screenshot_at_percentage(const char* video_path, double percentage, const char* output_path) {
  if (percentage < 0.0 || percentage > 100.0) return -1;

  // 1. 获取时长
  long long duration_ms = get_video_duration(video_path);
  if (duration_ms <= 0) return -1;

  // 2. 计算时间戳
  long long timestamp_ms = (long long)(duration_ms * (percentage / 100.0));

  // 3. 调用单张截图函数
  return generate_screenshot(video_path, timestamp_ms, output_path);
}
// --- END OF FILE Screenshotter.cpp ---
