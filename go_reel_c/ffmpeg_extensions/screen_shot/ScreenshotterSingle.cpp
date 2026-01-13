#include "Screenshotter.h"
#include "ScreenshotterInternal.h" // 使用 save_frame_internal
#include <libswscale/swscale.h> // 必须引入缩放库
#include <algorithm>            // 使用 std::min

// 依赖 get_video_duration，因为都在同一个项目，链接时能找到
extern "C" long long get_video_duration(const char* video_path);


// =================================================================
// 5. [修改] 单张截图 (适配 save_frame_internal)
// =================================================================
DLLEXPORT int generate_screenshot(const char* video_path, long long timestamp_ms, const char* output_path) {
  int ret = -1;
  AVFormatContext* format_ctx = nullptr;
  const AVCodec* decoder = nullptr;
  AVCodecContext* codec_ctx = nullptr;
  AVFrame* frame = nullptr;
  AVFrame* scaled_frame = nullptr; // 用于存储缩放后的帧
  AVPacket* packet = nullptr;
  struct SwsContext* sws_ctx = nullptr;
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
            // --- 缩放逻辑开始 ---
            int src_w = frame->width;
            int src_h = frame->height;
            int max_w = 540;
            int max_h = 320;

            // 判断是否需要缩放
            if (src_w > max_w || src_h > max_h) {
              double scale_w = (double)max_w / src_w;
              double scale_h = (double)max_h / src_h;
              double scale = std::min(scale_w, scale_h); // 等比例缩放因子

                int dst_w = (int)(src_w * scale);
                int dst_h = (int)(src_h * scale);

                // 初始化缩放上下文
                sws_ctx = sws_getContext(
                  src_w, src_h, (AVPixelFormat)frame->format,
                  dst_w, dst_h, (AVPixelFormat)frame->format, // 保持原始像素格式
                  SWS_BICUBIC, NULL, NULL, NULL
                );

                if (sws_ctx) {
                  scaled_frame = av_frame_alloc();
                  scaled_frame->format = frame->format;
                  scaled_frame->width = dst_w;
                  scaled_frame->height = dst_h;
                  av_frame_get_buffer(scaled_frame, 0);

                  // 执行缩放
                  sws_scale(sws_ctx, frame->data, frame->linesize, 0, src_h,
                    scaled_frame->data, scaled_frame->linesize);

                  // 使用缩放后的帧保存
                  ret = save_frame_internal(scaled_frame, output_path);
                }
              }
              else {
                // 无需缩放，直接保存
                ret = save_frame_internal(frame, output_path);
              }
              goto cleanup;

              // --- 缩放逻辑结束 ---
            
          }
          
        }
      }
    }
    av_packet_unref(packet);
  }

cleanup:
  if (sws_ctx) sws_freeContext(sws_ctx);
  if (packet) av_packet_free(&packet);
  if (frame) av_frame_free(&frame);
  if (scaled_frame) av_frame_free(&scaled_frame);
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
