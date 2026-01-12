// --- START OF FILE ffmpeg_extensions_test.cpp ---

#include <iostream>
#include <vector>
#include <string>
#include <filesystem>
#include <chrono>
#include <numeric>
#include <iomanip> // for std::setprecision
#include "screen_shot/Screenshotter.h" // 引用你的头文件

namespace fs = std::filesystem;

// 简单的计时器封装
class Stopwatch {
  using Clock = std::chrono::high_resolution_clock;
  std::chrono::time_point<Clock> start_time;
  std::chrono::time_point<Clock> end_time;
  bool running = false;

public:
  void Start() {
    start_time = Clock::now();
    running = true;
  }

  void Stop() {
    end_time = Clock::now();
    running = false;
  }

  long long ElapsedMilliseconds() const {
    auto end = running ? Clock::now() : end_time;
    return std::chrono::duration_cast<std::chrono::milliseconds>(end - start_time).count();
  }

  double ElapsedSeconds() const {
    return ElapsedMilliseconds() / 1000.0;
  }
};

// --- 测试函数声明 ---
void TestGetVideoDuration(const std::string& videoFile);
void TestFormats(const std::string& videoFile, const std::string& outputDir);
void TestPercentage(const std::string& videoFile, const std::string& outputDir);
void TestSingleVideoMultipleTimestamps(const std::string& videoFile, const std::string& outputDir);
void TestMultipleVideosSingleTimestamp(const std::vector<std::string>& videoFiles, const std::string& outputDir);

int main() {
  // ================== 配置路径 ==================
  // 请确保这些文件真实存在
  std::string testVideo1 = "../test_video/1.mp4";
  std::string testVideo2 = "../test_video/2.mp4";
  std::string outputDirectory = "../test_video/capture_cpp_test";
  // =============================================

  try {
    if (!fs::exists(outputDirectory)) {
      fs::create_directories(outputDirectory);
    }
  }
  catch (const std::exception& e) {
    std::cerr << "无法创建目录: " << e.what() << std::endl;
    return 1;
  }

  std::cout << "=== 开始测试 Screenshotter DLL (C++ Client) ===\n" << std::endl;

  // 1. 测试获取时长
  TestGetVideoDuration(testVideo1);

  // 2. 测试多格式支持 (WebP, JPG, PNG)
  TestFormats(testVideo1, outputDirectory);

  // 3. 测试百分比截图
  TestPercentage(testVideo1, outputDirectory);

  // 4. 测试批量截图 (根据真实时长动态生成时间戳)
  TestSingleVideoMultipleTimestamps(testVideo1, outputDirectory);

  // 5. 测试多视频处理
  TestMultipleVideosSingleTimestamp({ testVideo1, testVideo2 }, outputDirectory);

  std::cout << "\n=== 所有测试完成 ===" << std::endl;
  std::cout << "输出目录: " << fs::absolute(outputDirectory) << std::endl;
  std::cout << "按回车键退出..." << std::endl;
  std::cin.get();

  return 0;
}

// --- 测试实现 ---

void TestGetVideoDuration(const std::string& videoFile) {
  std::cout << "--- [Test 1] 获取视频时长 ---" << std::endl;
  if (!fs::exists(videoFile)) { std::cout << "Skipped: File not found.\n\n"; return; }

  Stopwatch sw;
  sw.Start();
  long long duration = get_video_duration(videoFile.c_str());
  sw.Stop();

  if (duration >= 0) {
    long long seconds = duration / 1000;
    long long minutes = seconds / 60;
    long long hours = minutes / 60;
    std::cout << "时长: " << duration << " ms ("
      << hours << "h:" << (minutes % 60) << "m:" << (seconds % 60) << "s)" << std::endl;
    std::cout << "查询耗时: " << sw.ElapsedMilliseconds() << " ms" << std::endl;
  }
  else {
    std::cout << "失败: 无法读取视频时长。" << std::endl;
  }
  std::cout << std::endl;
}

void TestFormats(const std::string& videoFile, const std::string& outputDir) {
  std::cout << "--- [Test 2] 多格式支持测试 (WebP/PNG/JPG) ---" << std::endl;
  if (!fs::exists(videoFile)) { std::cout << "Skipped: File not found.\n\n"; return; }

  struct { std::string ext; std::string desc; } formats[] = {
      {".webp", "WebP (Default)"},
      {".png",  "PNG (Lossless RGB)"},
      {".jpg",  "JPEG (Compressed)"}
  };

  long long timestamp = 5000; // 5秒处截图

  for (const auto& fmt : formats) {
    fs::path outPath = fs::path(outputDir) / ("format_test" + fmt.ext);
    std::string outStr = outPath.string();

    Stopwatch sw;
    sw.Start();
    int res = generate_screenshot(videoFile.c_str(), timestamp, outStr.c_str());
    sw.Stop();

    if (res == 0) {
      std::cout << "  [SUCCESS] " << fmt.desc << " -> " << outStr
        << " (" << sw.ElapsedMilliseconds() << " ms)" << std::endl;
    }
    else {
      std::cout << "  [FAILED]  " << fmt.desc << " (Code: " << res << ")" << std::endl;
    }
  }
  std::cout << std::endl;
}

void TestPercentage(const std::string& videoFile, const std::string& outputDir) {
  std::cout << "--- [Test 3] 百分比截图测试 ---" << std::endl;
  if (!fs::exists(videoFile)) { std::cout << "Skipped: File not found.\n\n"; return; }

  double percentages[] = { 10.0, 50.0, 90.0 };

  for (double pct : percentages) {
    std::string filename = "percent_" + std::to_string((int)pct) + ".jpg";
    fs::path outPath = fs::path(outputDir) / filename;

    Stopwatch sw;
    sw.Start();
    int res = generate_screenshot_at_percentage(videoFile.c_str(), pct, outPath.string().c_str());
    sw.Stop();

    if (res == 0) {
      std::cout << "  [SUCCESS] " << pct << "% -> " << filename
        << " (" << sw.ElapsedMilliseconds() << " ms)" << std::endl;
    }
    else {
      std::cout << "  [FAILED]  " << pct << "%" << std::endl;
    }
  }
  std::cout << std::endl;
}

void TestSingleVideoMultipleTimestamps(const std::string& videoFile, const std::string& outputDir) {
  std::cout << "--- [Test 4] 批量截图 (根据真实时长生成100张) ---" << std::endl;
  if (!fs::exists(videoFile)) { std::cout << "Skipped: File not found.\n\n"; return; }

  // 1. 获取真实时长
  long long duration = get_video_duration(videoFile.c_str());
  if (duration <= 0) {
    std::cout << "无法获取时长，使用默认值 60秒 测试。" << std::endl;
    duration = 60000;
  }

  // 2. 生成时间戳 (均匀分布)
  const int count = 100; // 压力测试
  std::vector<long long> timestamps;
  timestamps.reserve(count);

  // 避免头部和尾部，取中间段
  long long step = duration / (count + 2);
  for (int i = 1; i <= count; i++) {
    timestamps.push_back(step * i);
  }

  std::cout << "计划生成 " << count << " 张截图 (Format: WebP)..." << std::endl;

  fs::path tpl = fs::path(outputDir) / "batch_%ms.webp";

  Stopwatch sw;
  sw.Start();
  int success = generate_screenshots_for_video(
    videoFile.c_str(),
    timestamps.data(),
    (int)timestamps.size(),
    tpl.string().c_str()
  );
  sw.Stop();

  std::cout << "完成! 成功: " << success << " / " << count << std::endl;
  std::cout << "总耗时: " << std::fixed << std::setprecision(2) << sw.ElapsedSeconds() << " s" << std::endl;
  if (success > 0) {
    std::cout << "平均速度: " << (sw.ElapsedMilliseconds() / (double)success) << " ms/张" << std::endl;
  }
  std::cout << std::endl;
}

void TestMultipleVideosSingleTimestamp(const std::vector<std::string>& videoFiles, const std::string& outputDir) {
  std::cout << "--- [Test 5] 多视频并发处理 (Limit IO) ---" << std::endl;

  std::vector<const char*> validFiles;
  for (const auto& f : videoFiles) {
    if (fs::exists(f)) validFiles.push_back(f.c_str());
  }

  if (validFiles.empty()) {
    std::cout << "没有有效的视频文件进行测试。\n\n";
    return;
  }

  long long ts = 2000; // 2秒

  std::cout << "处理 " << validFiles.size() << " 个视频..." << std::endl;

  Stopwatch sw;
  sw.Start();
  int success = generate_screenshots_for_videos(
    validFiles.data(),
    (int)validFiles.size(),
    ts,
    outputDir.c_str()
  );
  sw.Stop();

  std::cout << "成功: " << success << " / " << validFiles.size() << std::endl;
  std::cout << "耗时: " << sw.ElapsedMilliseconds() << " ms" << std::endl;
  std::cout << std::endl;
}
// --- END OF FILE ffmpeg_extensions_test.cpp ---
