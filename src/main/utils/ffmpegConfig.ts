// main/utils/ffmpegConfig.ts

import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import log from 'electron-log';
import { app } from 'electron'; // 引入 electron app 模块

function findBinaries() {
  // 生产环境: in "resources/bin"
  const prodPath = path.join(process.resourcesPath, 'bin');

  // 开发环境: in project_root/bin
  const devPath = path.join(app.getAppPath(), 'bin');

  const binPath = fs.existsSync(path.join(prodPath, 'ffmpeg.exe')) || fs.existsSync(path.join(prodPath, 'ffmpeg'))
    ? prodPath
    : devPath;
    
  log.info(`[FFmpegConfig] Detected binary path: ${binPath}`);

  const isWindows = process.platform === 'win32';
  const ffmpegName = isWindows ? 'ffmpeg.exe' : 'ffmpeg';
  const ffprobeName = isWindows ? 'ffprobe.exe' : 'ffprobe';

  return {
    ffmpegPath: path.join(binPath, ffmpegName),
    ffprobePath: path.join(binPath, ffprobeName),
  };
}

const { ffmpegPath, ffprobePath } = findBinaries();

/**
 * 导出的 FFmpeg 二进制文件绝对路径，供 spawn 等直接调用
 */
export const ffmpegFullPath = ffmpegPath;
export const ffprobeFullPath = ffprobePath;

/**
 * 设置 fluent-ffmpeg 库使用的二进制文件路径
 * 应该在 Electron 应用主进程启动时调用一次
 */
export function setupFfmpeg() {
  if (fs.existsSync(ffmpegFullPath)) {
    ffmpeg.setFfmpegPath(ffmpegFullPath);
    log.info(`[FFmpegConfig] fluent-ffmpeg path set to: ${ffmpegFullPath}`);
  } else {
    log.error(`[FFmpegConfig] CRITICAL: ffmpeg binary not found at the configured path: ${ffmpegFullPath}`);
  }
  
  if (fs.existsSync(ffprobeFullPath)) {
    ffmpeg.setFfprobePath(ffprobeFullPath);
    log.info(`[FFmpegConfig] fluent-ffprobe path set to: ${ffprobeFullPath}`);
  } else {
    log.error(`[FFmpegConfig] CRITICAL: ffprobe binary not found at the configured path: ${ffprobeFullPath}`);
  }
}