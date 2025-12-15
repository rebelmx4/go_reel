#pragma once
#pragma once

// 如果是C++编译器，使用C风格的链接方式导出函数，
// 以便在其他语言中（例如C#）也能轻松调用。
#ifdef __cplusplus
extern "C" {
#endif

	// 使用 __declspec(dllexport) 将函数标记为从DLL导出
#define DLLEXPORT __declspec(dllexport)

/**
 * @brief [核心函数] 为单个视频的单个时间点生成一张截图。
 * @param video_path 视频文件的完整路径。
 * @param timestamp_ms 截图的时间点（毫秒）。
 * @param output_path_template 输出图片的完整路径。
 * @return 0 表示成功, 小于 0 表示失败。
 */
	DLLEXPORT int generate_screenshot(const char* video_path, long long timestamp_ms, const char* output_path);

	/**
	 * @brief [需求1] 为单个视频文件在多个时间点生成截图。
	 *        此函数内部会进行优化，只打开一次视频文件。
	 * @param video_path 视频文件的完整路径。
	 * @param timestamps_ms 一个包含所有截图时间点（毫秒）的数组。
	 * @param count 数组中时间点的数量。
	 * @param output_path_template 输出文件名的模板，例如 "D:/screenshots/capture_%ms.webp"。
	 *                             '%ms' 将被替换为对应的时间戳。
	 * @return 成功生成的截图数量。
	 */
	DLLEXPORT int generate_screenshots_for_video(const char* video_path, const long long* timestamps_ms, int count, const char* output_path_template);

	/**
	 * @brief [需求2] 为多个视频文件在同一个时间点生成截图。
	 * @param video_paths 一个包含所有视频文件完整路径的数组。
	 * @param count 数组中视频路径的数量。
	 * @param timestamp_ms 截图的时间点（毫秒）。
	 * @param output_dir 指定的输出目录。文件名将根据原视频文件名生成。
	 * @return 成功生成的截图数量。
	 */
	DLLEXPORT int generate_screenshots_for_videos(const char* const* video_paths, int count, long long timestamp_ms, const char* output_dir);


#ifdef __cplusplus
}
#endif