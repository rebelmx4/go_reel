#include "Screenshotter.h" // 包含 DLLEXPORT 定义
#include "ScreenshotterInternal.h" // 包含 FFmpeg 头文件


// =================================================================
// 2. 获取视频时长 (毫秒)
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
// 获取视频完整元数据
// =================================================================

DLLEXPORT VideoInfoResult get_video_metadata(const char* video_path) {
  VideoInfoResult result = { 0, 0, 0, 0.0, 0 }; // 初始化默认值 (success=0)

  // 抑制日志
  av_log_set_level(AV_LOG_ERROR);

  AVFormatContext* format_ctx = nullptr;
  if (avformat_open_input(&format_ctx, video_path, NULL, NULL) != 0) {
    return result;
  }

  if (avformat_find_stream_info(format_ctx, NULL) < 0) {
    avformat_close_input(&format_ctx);
    return result;
  }

  // 1. 获取总时长 (转换 AV_TIME_BASE 到 毫秒)
  if (format_ctx->duration != AV_NOPTS_VALUE) {
    result.duration_ms = format_ctx->duration / 1000;
  }

  // 2. 查找最佳视频流
  int video_stream_index = av_find_best_stream(format_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, NULL, 0);

  if (video_stream_index >= 0) {
    AVStream* stream = format_ctx->streams[video_stream_index];
    AVCodecParameters* codecpar = stream->codecpar;

    // 获取宽、高
    result.width = codecpar->width;
    result.height = codecpar->height;

    // 获取帧率 (优先使用 avg_frame_rate)
    if (stream->avg_frame_rate.den > 0) {
      result.framerate = av_q2d(stream->avg_frame_rate);
    }
    else if (stream->r_frame_rate.den > 0) {
      // 如果 avg 无效，尝试 r_frame_rate (基本帧率)
      result.framerate = av_q2d(stream->r_frame_rate);
    }
    else {
      result.framerate = 30.0; // 兜底
    }

    result.success = 1; // 标记成功
  }

  avformat_close_input(&format_ctx);
  return result;
}
