using System;
using System.Diagnostics; // 1. 引入计时器所需的命名空间
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;

namespace DllTester
{
  class Program
  {
    // 内部静态类，用于封装所有 P/Invoke 调用
    internal static class NativeMethods
    {
      // 定义你的 DLL 文件名。确保它和你的 C++ 项目生成的文件名一致。
      private const string DllName = "ffmpeg_utils.dll";

      // 导入第一个函数：为单个视频、单个时间点截图
      [DllImport(DllName, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
      public static extern int generate_screenshot(string video_path, long timestamp_ms, string output_path);

      // 导入第二个函数：为单个视频、多个时间点截图
      // C++ 的 const long long* 对应 C# 的 long[]
      [DllImport(DllName, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
      public static extern int generate_screenshots_for_video(string video_path, long[] timestamps_ms, int count, string output_path_template);

      // 导入第三个函数：为多个视频、单个时间点截图
      // C++ 的 const char* const* 对应 C# 的 string[]
      [DllImport(DllName, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
      public static extern int generate_screenshots_for_videos(string[] video_paths, int count, long timestamp_ms, string output_dir);
    }

    static void Main(string[] args)
    {
      // ==================  !!! 重要 !!! ==================
      // ================== 请修改以下路径 ==================
      // 注意：请确保 testVideo1 是一个长视频（例如30分钟），以满足测试2的要求。
      string testVideo1 = @"E:\100_MyProjects\go_reel_videos\1.mp4";
      string testVideo2 = @"E:\100_MyProjects\go_reel_videos\2.mp4";
      string outputDirectory = @"E:\100_MyProjects\1";
      // ======================================================

      // 确保输出目录存在
      Directory.CreateDirectory(outputDirectory);

      Console.WriteLine("开始测试 DLL 函数...\n");

      // --- 情况 1: 为单个视频在指定时间点截图 ---
      TestSingleVideoSingleTimestamp(testVideo1, outputDirectory);

      // --- 情况 2: 为单个视频在多个时间点截图 ---
      TestSingleVideoMultipleTimestamps(testVideo1, outputDirectory);

      // --- 情况 3: 为多个视频在同一个时间点截图 ---
      TestMultipleVideosSingleTimestamp(new[] { testVideo1, testVideo2 }, outputDirectory);

      Console.WriteLine("\n所有测试完成。请检查输出目录: " + outputDirectory);
      Console.ReadKey();
    }

    private static void TestSingleVideoSingleTimestamp(string videoFile, string outputDir)
    {
      Console.WriteLine("--- 1. 测试: 单个视频, 单个时间点 (5秒) ---");
      if (!File.Exists(videoFile))
      {
        Console.WriteLine($"错误: 测试视频文件未找到: {videoFile}\n");
        return;
      }
      string outputPath = Path.Combine(outputDir, "case1_single_shot_5000ms.webp");

      var stopwatch = new Stopwatch(); // 创建计时器

      try
      {
        stopwatch.Start(); // 开始计时
        int result = NativeMethods.generate_screenshot(videoFile, 5000, outputPath); // 截图在 5000ms (5秒)
        stopwatch.Stop(); // 停止计时

        if (result == 0)
        {
          Console.WriteLine($"成功! 截图已保存到: {outputPath}");
          Console.WriteLine($"执行耗时: {stopwatch.ElapsedMilliseconds} ms\n");
        }
        else
        {
          Console.WriteLine($"失败! DLL 返回错误码: {result}\n");
        }
      }
      catch (Exception ex)
      {
        Console.WriteLine($"调用 DLL 时发生异常: {ex.Message}\n");
      }
    }

    private static void TestSingleVideoMultipleTimestamps(string videoFile, string outputDir)
    {
      Console.WriteLine("--- 2. 测试: 单个视频, 多个时间点 (为30分钟视频平均生成100个截图) ---");
      if (!File.Exists(videoFile))
      {
        Console.WriteLine($"错误: 测试视频文件未找到: {videoFile}\n");
        return;
      }

      // --- 为一个30分钟的视频生成100个均匀分布的时间点 ---
      const long videoDurationMs = 30 * 60 * 1000;
      const int screenshotCount = 100;
      long[] timestamps = new long[screenshotCount];
      long interval = videoDurationMs / (screenshotCount + 1); // +1 是为了避免取到视频的最开始和最末尾，使分布更均匀

      for (int i = 0; i < screenshotCount; i++)
      {
        timestamps[i] = interval * (i + 1);
      }
      Console.WriteLine($"已生成 {screenshotCount} 个时间点, 从 {timestamps.First()}ms 到 {timestamps.Last()}ms。");
      // --------------------------------------------------------

      string templatePath = Path.Combine(outputDir, "case2_multi_shot_%ms.webp");

      var stopwatch = new Stopwatch(); // 创建计时器

      try
      {
        stopwatch.Start(); // 开始计时
        int successCount = NativeMethods.generate_screenshots_for_video(videoFile, timestamps, timestamps.Length, templatePath);
        stopwatch.Stop(); // 停止计时

        Console.WriteLine($"成功生成 {successCount} / {timestamps.Length} 张截图。");
        Console.WriteLine($"总耗时: {stopwatch.Elapsed.TotalSeconds:F2} 秒 ({stopwatch.ElapsedMilliseconds} ms)");
        if (successCount > 0)
        {
          Console.WriteLine($"平均每张截图耗时: {stopwatch.ElapsedMilliseconds / (double)successCount:F2} ms");
        }
        Console.WriteLine("文件名应为 case2_multi_shot_18000.webp, case2_multi_shot_36000.webp 等。\n");
      }
      catch (Exception ex)
      {
        Console.WriteLine($"调用 DLL 时发生异常: {ex.Message}\n");
      }
    }

    private static void TestMultipleVideosSingleTimestamp(string[] videoFiles, string outputDir)
    {
      Console.WriteLine("--- 3. 测试: 多个视频, 单个时间点 (2秒) ---");
      foreach (var file in videoFiles)
      {
        if (!File.Exists(file))
        {
          Console.WriteLine($"错误: 测试视频文件未找到: {file}\n");
          return;
        }
      }

      long timestamp = 2000; // 统一在 2 秒处截图
      var stopwatch = new Stopwatch(); // 创建计时器

      try
      {
        stopwatch.Start(); // 开始计时
        int successCount = NativeMethods.generate_screenshots_for_videos(videoFiles, videoFiles.Length, timestamp, outputDir);
        stopwatch.Stop(); // 停止计时

        Console.WriteLine($"成功为 {successCount} / {videoFiles.Length} 个视频生成截图。");
        Console.WriteLine($"总耗时: {stopwatch.Elapsed.TotalSeconds:F2} 秒 ({stopwatch.ElapsedMilliseconds} ms)");
        if (successCount > 0)
        {
          Console.WriteLine($"平均每个视频耗时: {stopwatch.ElapsedMilliseconds / (double)successCount:F2} ms");
        }
        Console.WriteLine("文件名应根据原视频名生成，例如 1.webp, 2.webp 等。\n");
      }
      catch (Exception ex)
      {
        Console.WriteLine($"调用 DLL 时发生异常: {ex.Message}\n");
      }
    }
  }
}
