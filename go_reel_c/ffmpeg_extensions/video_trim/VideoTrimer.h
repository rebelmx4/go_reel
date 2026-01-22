// video_trim/VideoExporter.h
#pragma once

#include "../common.h"

#ifdef __cplusplus
extern "C" {
#endif

  // 用于返回给 Node.js 的物理信息
  typedef struct {
    long long actual_start_ms;    // 物理起始点：Seek 之后第一帧视频的原始时间戳
    long long actual_duration_ms; // 物理长度：该片段在输出文件中的总长度
  } SegmentInfo;


  /**
   * @brief 高速无损裁剪合并视频 (Stream Copy 模式)
   *
   * @param input_path       输入视频文件的绝对路径 (UTF-8)
   * @param output_path      输出裁剪后视频的绝对路径 (UTF-8)
   * @param starts_ms        每个片段请求的起始时间戳数组 (毫秒)
   * @param ends_ms          每个片段请求的结束时间戳数组 (毫秒)
   * @param count            片段总数
   * @param out_info         [输出] 数组，长度必须等于 count，用于返回每段的物理起始点和长度
   *
   * @return int             返回 0 表示成功，小于 0 表示 FFmpeg 内部错误代码
   */
  DLLEXPORT int trim_video(
    const char* input_path,
    const char* output_path,
    const long long* starts_ms,
    const long long* ends_ms,
    int count,
    SegmentInfo* out_info
  );

#ifdef __cplusplus
}
#endif
