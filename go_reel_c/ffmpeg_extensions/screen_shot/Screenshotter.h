#pragma once

#include <cstdint> // 为了使用 int64_t
#include "../common.h"


#ifdef __cplusplus
extern "C" {
#endif

  typedef struct {
    long long duration_ms; // 时长 (毫秒)
    int width;             // 宽度
    int height;            // 高度
    double framerate;      // 帧率 (FPS)
    int success;           // 1 = 成功, 0 = 失败
  } VideoInfoResult;


  DLLEXPORT VideoInfoResult get_video_metadata(const char* video_path);

  /**
   * @brief [新增功能] 获取视频时长（毫秒）。
   * @param video_path 视频文件的完整路径。
   * @return 视频时长（毫秒）。如果失败返回 -1。
   */
  DLLEXPORT long long get_video_duration(const char* video_path);

  /**
   * @brief [核心功能] 为单个视频的单个时间点生成一张截图。
   *        (现已支持 .webp, .png, .jpg，根据 output_path 后缀自动判断)
   * @param video_path 视频文件的完整路径。
   * @param timestamp_ms 截图的时间点（毫秒）。
   * @param output_path 输出图片的完整路径。
   * @return 0 表示成功, 小于 0 表示失败。
   */
  DLLEXPORT int generate_screenshot(const char* video_path, long long timestamp_ms, const char* output_path);

  /**
   * @brief [新增功能] 根据视频时长的百分比生成截图。
   * @param video_path 视频文件的完整路径。
   * @param percentage 百分比 (0.0 - 100.0)。
   * @param output_path 输出图片的完整路径。
   * @return 0 表示成功, 小于 0 表示失败。
   */
  DLLEXPORT int generate_screenshot_at_percentage(const char* video_path, double percentage, const char* output_path);

  /**
   * @brief [批量功能] 单视频多截图 (高性能版)。
   */
  DLLEXPORT int generate_screenshots_for_video(const char* video_path, const long long* timestamps_ms, int count, const char* output_path_template);

  /**
   * @brief [批量功能] 多视频同时间点截图 (IO优化版)。
   */
  DLLEXPORT int generate_screenshots_for_videos(const char* const* video_paths, int count, long long timestamp_ms, const char* output_dir);

#ifdef __cplusplus
}
#endif
