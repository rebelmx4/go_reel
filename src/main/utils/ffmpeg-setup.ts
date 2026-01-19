import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

/**
 * 配置 fluent-ffmpeg 使用工程根目录 bin 文件夹下的二进制文件
 */
export function setupFfmpeg() {
  // 获取当前工作目录（通常是项目根目录）
  // 如果你在开发环境，process.cwd() 就是项目根目录
  const projectRoot = process.cwd();
  const binPath = path.join(projectRoot, 'bin');

  // 根据操作系统决定文件后缀
  const isWindows = process.platform === 'win32';
  const ffmpegName = isWindows ? 'ffmpeg.exe' : 'ffmpeg';
  const ffprobeName = isWindows ? 'ffprobe.exe' : 'ffprobe';

  // 拼接完整路径
  const ffmpegFullPath = path.join(binPath, ffmpegName);
  const ffprobeFullPath = path.join(binPath, ffprobeName);

  try {
    // 设置 ffmpeg 路径
    ffmpeg.setFfmpegPath(ffmpegFullPath);
    console.log('FFMpeg path set to:', ffmpegFullPath);

    // 设置 ffprobe 路径
    ffmpeg.setFfprobePath(ffprobeFullPath);
    console.log('FFprobe path set to:', ffprobeFullPath);
  } catch (err) {
    console.error('Failed to set ffmpeg paths:', err);
  }
}