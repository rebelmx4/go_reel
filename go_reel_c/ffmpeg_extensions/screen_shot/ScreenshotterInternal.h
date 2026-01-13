#pragma once
#include <string>

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/imgutils.h>
#include <libswscale/swscale.h>
#include <libavutil/opt.h>
#include <libavutil/log.h>
#include <libavutil/time.h>
}

// 内部使用的辅助函数声明
bool ends_with_ignore_case(const char* str, const char* suffix);

// 核心保存函数，供 Batch 和 Single 模块调用
int save_frame_internal(const AVFrame* frame, const char* out_path);
