#include "VideoTrimer.h"
#include <vector>
#include <algorithm>

// 内部状态维护
struct StreamState {
  long long first_pts = -1;
  long long first_dts = -1;
  long long next_offset_tb = 0;
  long long current_clip_duration_tb = 0;
  long long last_written_dts_out = AV_NOPTS_VALUE;
};

/**
 * 高速裁剪合并视频 (针对 HTML5 兼容容器优化版)
 */
DLLEXPORT int trim_video(const char* input_path, const char* output_path,
  const long long* starts_ms, const long long* ends_ms,
  int count, SegmentInfo* out_info) {

  // --- 1. 将所有变量声明移至顶部，解决 C2362 错误 ---
  AVFormatContext* ifmt_ctx = nullptr;
  AVFormatContext* ofmt_ctx = nullptr;
  AVPacket* pkt = nullptr;
  AVDictionary* muxer_opts = nullptr;
  int ret = 0;
  int video_idx = -1;
  int out_stream_counter = 0;

  // C++ 容器必须在第一个 goto 之前定义
  std::vector<int> stream_mapping;
  std::vector<StreamState> states;

  // 抑制冗余日志
  av_log_set_level(AV_LOG_ERROR);

  pkt = av_packet_alloc();
  if (!pkt) return -1;

  // 1. 打开输入
  if ((ret = avformat_open_input(&ifmt_ctx, input_path, NULL, NULL)) < 0) goto cleanup;
  if ((ret = avformat_find_stream_info(ifmt_ctx, NULL) < 0)) goto cleanup;

  // 2. 初始化输出
  avformat_alloc_output_context2(&ofmt_ctx, NULL, NULL, output_path);
  if (!ofmt_ctx) { ret = -1; goto cleanup; }

  // 开启自动比特流过滤
  ofmt_ctx->flags |= AVFMT_FLAG_AUTO_BSF;

  stream_mapping.assign(ifmt_ctx->nb_streams, -1);

  // 3. 准备流映射与元数据拷贝
  for (unsigned int i = 0; i < ifmt_ctx->nb_streams; i++) {
    AVStream* in_stream = ifmt_ctx->streams[i];
    if (in_stream->codecpar->codec_type != AVMEDIA_TYPE_VIDEO &&
      in_stream->codecpar->codec_type != AVMEDIA_TYPE_AUDIO) continue;

    if (in_stream->codecpar->codec_type == AVMEDIA_TYPE_VIDEO && video_idx == -1)
      video_idx = i;

    stream_mapping[i] = out_stream_counter++;
    AVStream* out_stream = avformat_new_stream(ofmt_ctx, NULL);

    avcodec_parameters_copy(out_stream->codecpar, in_stream->codecpar);

    uint32_t tag = 0;
    if (av_codec_get_tag2(ofmt_ctx->oformat->codec_tag, in_stream->codecpar->codec_id, &tag))
      out_stream->codecpar->codec_tag = tag;
    else
      out_stream->codecpar->codec_tag = 0;

    // --- 修复 C4996: 局部忽略 side_data 弃用警告 ---
#pragma warning(push)
#pragma warning(disable: 4996)
    for (int j = 0; j < in_stream->nb_side_data; j++) {
      const AVPacketSideData* sd = &in_stream->side_data[j];
      uint8_t* dst = av_stream_new_side_data(out_stream, sd->type, sd->size);
      if (dst) memcpy(dst, sd->data, sd->size);
    }
#pragma warning(pop)

    av_dict_copy(&out_stream->metadata, in_stream->metadata, 0);
    states.push_back(StreamState());
  }

  av_dict_copy(&ofmt_ctx->metadata, ifmt_ctx->metadata, 0);

  if (video_idx == -1) { ret = -1; goto cleanup; }

  if (!(ofmt_ctx->oformat->flags & AVFMT_NOFILE)) {
    if ((ret = avio_open(&ofmt_ctx->pb, output_path, AVIO_FLAG_WRITE)) < 0) goto cleanup;
  }

  av_dict_set(&muxer_opts, "movflags", "faststart", 0);
  if ((ret = avformat_write_header(ofmt_ctx, &muxer_opts)) < 0) goto cleanup;

  // 4. 片段处理大循环
  for (int i = 0; i < count; i++) {
    long long target_start_ms = starts_ms[i];
    long long target_end_ms = ends_ms[i];

    int64_t seek_target = av_rescale_q(target_start_ms, { 1, 1000 }, ifmt_ctx->streams[video_idx]->time_base);
    av_seek_frame(ifmt_ctx, video_idx, seek_target, AVSEEK_FLAG_BACKWARD);

    for (auto& s : states) { s.first_pts = -1; s.first_dts = -1; s.current_clip_duration_tb = 0; }

    bool video_started = false;
    long long master_anchor_dts = AV_NOPTS_VALUE;
    long long clip_v_duration_ms = 0;

    while (av_read_frame(ifmt_ctx, pkt) >= 0) {
      int out_idx = stream_mapping[pkt->stream_index];
      if (out_idx < 0) { av_packet_unref(pkt); continue; }

      AVStream* in_stream = ifmt_ctx->streams[pkt->stream_index];
      StreamState& state = states[out_idx];

      long long pts_ms = av_rescale_q(pkt->pts, in_stream->time_base, { 1, 1000 });
      if (pkt->stream_index == video_idx && pts_ms > target_end_ms) {
        av_packet_unref(pkt);
        break;
      }

      if (!video_started) {
        if (pkt->stream_index == video_idx && (pkt->flags & AV_PKT_FLAG_KEY)) {
          video_started = true;
          master_anchor_dts = pkt->dts;
          out_info[i].actual_start_ms = pts_ms;
        }
      }
      if (!video_started) { av_packet_unref(pkt); continue; }

      if (state.first_dts == -1) {
        state.first_dts = av_rescale_q(master_anchor_dts,
          ifmt_ctx->streams[video_idx]->time_base,
          in_stream->time_base);
      }

      long long dts_offset = pkt->dts - state.first_dts;
      long long pts_offset = pkt->pts - state.first_dts;

      if (dts_offset < 0) { av_packet_unref(pkt); continue; }

      pkt->pts = pts_offset + state.next_offset_tb;
      pkt->dts = dts_offset + state.next_offset_tb;

      long long pkt_duration = pkt->duration;
      if (pkt_duration <= 0) {
        if (in_stream->codecpar->codec_type == AVMEDIA_TYPE_VIDEO)
          pkt_duration = in_stream->avg_frame_rate.num > 0 ?
          av_rescale_q(1, av_inv_q(in_stream->avg_frame_rate), in_stream->time_base) :
          av_rescale_q(1, { 1, 30 }, in_stream->time_base);
        else
          pkt_duration = av_rescale_q(1024, { 1, in_stream->codecpar->sample_rate ? in_stream->codecpar->sample_rate : 44100 }, in_stream->time_base);
      }

      state.current_clip_duration_tb = (std::max)(state.current_clip_duration_tb, pts_offset + pkt_duration);
      if (pkt->stream_index == video_idx) {
        clip_v_duration_ms = av_rescale_q(state.current_clip_duration_tb, in_stream->time_base, { 1, 1000 });
      }

      av_packet_rescale_ts(pkt, in_stream->time_base, ofmt_ctx->streams[out_idx]->time_base);

      if (state.last_written_dts_out != AV_NOPTS_VALUE && pkt->dts <= state.last_written_dts_out) {
        av_packet_unref(pkt);
        continue;
      }
      state.last_written_dts_out = pkt->dts;

      pkt->stream_index = out_idx;
      av_interleaved_write_frame(ofmt_ctx, pkt);
      av_packet_unref(pkt);
    }

    long long master_duration_tb = states[stream_mapping[video_idx]].current_clip_duration_tb;
    AVRational master_tb = ifmt_ctx->streams[video_idx]->time_base;
    out_info[i].actual_duration_ms = clip_v_duration_ms;

    for (int j = 0; j < (int)ifmt_ctx->nb_streams; j++) {
      int o_idx = stream_mapping[j];
      if (o_idx == -1) continue;
      states[o_idx].next_offset_tb += av_rescale_q(master_duration_tb, master_tb, ifmt_ctx->streams[j]->time_base);
    }
  }

  av_write_trailer(ofmt_ctx);

cleanup:
  if (pkt) av_packet_free(&pkt);
  if (muxer_opts) av_dict_free(&muxer_opts);
  if (ifmt_ctx) avformat_close_input(&ifmt_ctx);
  if (ofmt_ctx) {
    if (ofmt_ctx->pb) avio_closep(&ofmt_ctx->pb);
    avformat_free_context(ofmt_ctx);
  }
  return ret;
}
