import path from 'path';
import ffmpeg, { FfprobeData } from 'fluent-ffmpeg';
import fs from 'fs';
import { spawn } from 'child_process';

/**
 * 配置 fluent-ffmpeg 使用工程根目录 bin 文件夹下的二进制文件
 */

const projectRoot = process.cwd();
const binPath = path.join(projectRoot, 'bin');

const isWindows = process.platform === 'win32';
const ffmpegName = isWindows ? 'ffmpeg.exe' : 'ffmpeg';
const ffprobeName = isWindows ? 'ffprobe.exe' : 'ffprobe';

const ffmpegFullPath = path.join(binPath, ffmpegName);
const ffprobeFullPath = path.join(binPath, ffprobeName);

if (!fs.existsSync(ffmpegFullPath) || !fs.existsSync(ffprobeFullPath)) {
console.error('CRITICAL: FFmpeg binaries not found at:', binPath);
}

export function setupFfmpeg() {
  ffmpeg.setFfmpegPath(ffmpegFullPath);
  ffmpeg.setFfprobePath(ffprobeFullPath);
}

/**
 * 视频处理工具类
 */
export class VideoMetadataUtils {
  /**
   * 获取视频所有关键帧的时间戳
   */
  static async getKeyframes(filePath: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      // 1. 还原你测试成功的参数：查 packet 级的 flags
      const args = [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'packet=pts_time,flags',
        '-of', 'csv=p=0',
        filePath
      ];

      const child = spawn(ffprobeFullPath, args);
      let output = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe exited with code ${code}`));
          return;
        }

        // 2. 模拟 findstr "K" 的逻辑
        const timestamps = output
          .split('\n')
          .map(line => line.trim())
          // 过滤出包含 ",K" 的行（CSV 格式下 flags 紧跟在时间后面）
          .filter(line => line.includes(',K')) 
          // 提取逗号前的时间戳部分
          .map(line => line.split(',')[0])
          .map(Number)
          .filter(n => !isNaN(n));

        // 3. 排序并返回
        resolve(timestamps.sort((a, b) => a - b));
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * 根据用户选择的时间段，计算物理切割边界（宁多勿少原则）
   */
  static getPhysicalRange(keyframes: number[], startTime: number, endTime: number) {
    if (keyframes.length === 0) {
        return { pStart: startTime, pEnd: endTime, logicOffset: 0 };
    }

    // 1. 找到小于等于 startTime 的最大关键帧 (物理起点)
    // 使用 reverse 寻找最后一个满足条件的点，性能更好
    let pStart = keyframes[0];
    for (let i = 0; i < keyframes.length; i++) {
        if (keyframes[i] <= startTime) {
            pStart = keyframes[i];
        } else {
            break;
        }
    }

    // 2. 找到大于等于 endTime 的最小关键帧 (物理终点)
    let pEnd = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length; i++) {
        if (keyframes[i] >= endTime) {
            pEnd = keyframes[i];
            break;
        }
    }

    return {
      pStart, 
      pEnd,   
      logicOffset: startTime - pStart 
    };
  }

  /**
   * 提取单个物理片段
   */
  static async extractSegment(input: string, start: number, duration: number, output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'error',
        '-ss', start.toString(),
        '-i', input,
        '-t', duration.toString(),
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        '-map', '0',
        '-y', output
      ];
      const child = spawn(ffmpegFullPath, args);
      child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Extract segment failed: ${code}`)));
    });
  }

  /**
   * 合并多个片段
   */
  static async concatFiles(fileListPath: string, output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'error',
        '-f', 'concat',
        '-safe', '0',
        '-i', fileListPath,
        '-c', 'copy',
        '-y', output
      ];
      const child = spawn(ffmpegFullPath, args);
      child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Concat failed: ${code}`)));
    });
  }
}