#pragma once
#include <string>
#include "../common.h"

// 内部使用的辅助函数声明
bool ends_with_ignore_case(const char* str, const char* suffix);

// 核心保存函数，供 Batch 和 Single 模块调用
int save_frame_internal(const AVFrame* frame, const char* out_path);
