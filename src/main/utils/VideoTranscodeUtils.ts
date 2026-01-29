import ffmpeg, { FfprobeData } from 'fluent-ffmpeg';
import log from 'electron-log';

/**
 * 视频转码工具类
 */
export class VideoTranscodeUtils {
  /**
   * 将视频转码为高兼容性的 MP4 格式 (H.264/AAC)
   * @param inputPath 输入视频的绝对路径
   * @param outputPath 输出视频的绝对路径
   * @param onProgress 可选的回调函数，用于接收转码进度 (0-100)
   * @returns Promise<void> 在转码完成时 resolve，失败时 reject
   */
  public static async transcodeToH264(
    inputPath: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // 首先获取总时长，用于计算进度
    let totalDuration = 0;
    try {
      const metadata = await new Promise<FfprobeData>((resolve, reject) => {
        ffmpeg(inputPath).ffprobe((err, data) => {
          if (err) return reject(err);
          resolve(data);
        });
      });
      totalDuration = metadata.format.duration || 0;
    } catch (error) {
      log.warn(`[Transcode] Could not get video duration for progress calculation for ${inputPath}:`, error);
    }

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')     // H.264 视频编码器，兼容性最强
        .audioCodec('aac')  // AAC 音频编码器，标准选择
        .format('mp4')       
        .outputOptions([
          '-pix_fmt yuv420p',    // 像素格式，确保颜色在所有设备上正确显示
          '-preset veryfast',    // 在速度和压缩率之间取得良好平衡
          '-crf 23',             // 恒定速率因子，控制视频质量。18-28 是常用范围，23 是很好的默认值
          '-movflags +faststart' // 将 moov atom 提前，支持网络流式播放
        ])
        .on('error', (err, stdout, stderr) => {
          // 记录更详细的错误日志
          log.error(`[Transcode] Failed to transcode ${inputPath}:`, err.message);
          log.error(`[Transcode] FFmpeg stdout:`, stdout);
          log.error(`[Transcode] FFmpeg stderr:`, stderr);
          reject(new Error(`转码失败: ${err.message}`));
        })
        .on('end', (stdout, stderr) => {
          log.info(`[Transcode] Successfully transcoded ${inputPath} to ${outputPath}`);
          log.debug(`[Transcode] FFmpeg stdout:`, stdout);
          log.debug(`[Transcode] FFmpeg stderr:`, stderr);
          resolve();
        })
        .on('progress', (progress) => {
          if (onProgress && totalDuration > 0) {
            // fluent-ffmpeg 的 progress.percent 字段有时不准确，我们手动计算
            const timemark = progress.timemark; // 格式通常是 "HH:MM:SS.ms"
            const timeParts = timemark.split(':');
            const seconds = parseFloat(timeParts[0]) * 3600 + parseFloat(timeParts[1]) * 60 + parseFloat(timeParts[2]);
            
            if (!isNaN(seconds)) {
                let percent = Math.floor((seconds / totalDuration) * 100);
                percent = Math.min(100, Math.max(0, percent)); // 保证在 0-100 范围
                onProgress(percent);
            }
          }
        })
        .save(outputPath);
    });
  }
}


