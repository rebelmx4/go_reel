#include "pch.h"
#include "Screenshotter.h"
#include "ScreenshotterInternal.h"
#include <vector>
#include <algorithm>
#include <filesystem>
#include <future>
#include <deque>
#include <thread>

using namespace std::chrono_literals;


// =================================================================
// 3. [核心功能] 单视频批量截图
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
