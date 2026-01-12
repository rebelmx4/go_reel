#include "pch.h"
#include "ScreenshotterInternal.h"
#include <cstring> 

#ifdef _WIN32
#define STRICMP _stricmp
#else
#define STRICMP strcasecmp
#endif


// =================================================================
// 内部工具：简单的字符串不区分大小写比较 (跨平台兼容)
// =================================================================
bool ends_with_ignore_case(const char* str, const char* suffix) {
  if (!str || !suffix) return false;
  size_t len_str = strlen(str);
  size_t len_suffix = strlen(suffix);
  if (len_suffix > len_str) return false;

  const char* ptr_str = str + len_str - len_suffix;
  return STRICMP(ptr_str, suffix) == 0;
}

// =================================================================
// 1. [重构] 内部核心函数：通用帧保存 (支持 WebP, PNG, JPG)
//    根据 out_path 的后缀自动选择编码器
// =================================================================
int save_frame_internal(const AVFrame* frame, const char* out_path)
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
