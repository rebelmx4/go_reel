import * as fs from 'fs/promises';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';

/**
 * 定义截图生成时可以传入的选项
 */
export interface ScreenshotOptions {
  // 截图的输出目录
  outputDir: string;
  // 文件名前缀 (可选)
  filenamePrefix?: string;
  // 输出格式 (可选, 默认 'webp')
  format?: 'webp' | 'png' | 'jpg';
}

/**
 * 一个工具类，用于从视频文件生成截图。
 * 所有方法均为静态，无需实例化。
 */
export class ScreenshotGenerator {

  /**
   * 获取视频的时长（秒）。
   * @param videoPath - 视频文件的路径。
   * @returns 返回包含时长的 Promise，如果无法获取则抛出错误。
   */
  public static getVideoDuration(videoPath: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          return reject(new Error(`Failed to probe video: ${err.message}`));
        }
        const duration = metadata.format.duration;
        if (duration === undefined) {
          return reject(new Error('Could not determine video duration from metadata.'));
        }
        resolve(duration);
      });
    });
  }

  /**
   * 在视频的指定时间点生成一张截图。
   * @param videoPath - 视频文件的路径。
   * @param timestampInSeconds - 截图的时间点（单位：秒）。
   * @param outputDir - 截图的输出目录。
   * @returns 成功则返回截图文件的完整路径，失败则【抛出错误】。
   */
  public static async generateScreenshotAtTimestamp(
    videoPath: string,
    timestampInSeconds: number,
    outputDir: string,
  ): Promise<string> { // <--- [修改点] 返回值类型现在是 Promise<string>，不再有 null
    await fs.mkdir(outputDir, { recursive: true });

    const tempFilename = `${Date.now()}_${Math.random()}.webp`;
    const outputPath = path.join(outputDir, tempFilename);

    return new Promise<string>((resolve, reject) => { // <--- 使用 resolve 和 reject
      ffmpeg(videoPath)
        .seekInput(timestampInSeconds)
        .frames(1)
        .outputOptions('-vcodec', 'webp', '-lossless', '1', '-q:v', '75')
        .output(outputPath)
        .on('end', () => resolve(outputPath)) // 成功时 resolve
        .on('error', (err) => {
          // <--- [修改点] 失败时调用 reject，而不是 resolve(null)
          reject(new Error(`[ScreenshotGenerator] Failed at ${timestampInSeconds}s: ${err.message}`));
        })
        .run();
    });
  }
  /**
   * 在视频时长的指定百分比位置生成一张截图。
   * @param videoPath - 视频文件的路径。
   * @param percentage - 百分比位置 (0-100)。
   * @param options - 输出选项，包括输出目录等。
   * @returns 成功则返回截图文件的完整路径，失败则返回 null。
   */
  public static async generateScreenshotAtPercentage(
    videoPath: string,
    percentage: number,
    options: ScreenshotOptions
  ): Promise<string | null> {
    if (percentage < 0 || percentage > 100) {
      console.error('[ScreenshotGenerator] Percentage must be between 0 and 100.');
      return null;
    }

    try {
      const duration = await this.getVideoDuration(videoPath);
      const timestamp = duration * (percentage / 100);
      return this.generateScreenshotAtTimestamp(videoPath, timestamp, options);
    } catch (error) {
      console.error('[ScreenshotGenerator] Failed to generate screenshot by percentage:', error);
      return null;
    }
  }


  /**
   * 通过单次 FFMpeg 调用在多个指定时间点高效生成截图。
   * 此版本使用多个输出的方案，以实现最佳的性能和兼容性。
   * @param videoPath - 视频文件的路径。
   * @param timestamps - 一个包含所有截图时间点（秒）的数组。
   * @param options - 输出选项，包括输出目录等。
   * @returns 返回一个包含所有成功生成的【临时】截图文件路径的数组。
   */
  public static async generateMultipleScreenshots(
    videoPath: string,
    timestamps: number[],
    options: ScreenshotOptions
  ): Promise<string[]> {
    if (!timestamps || timestamps.length === 0) {
      return [];
    }
    // 必须对时间戳进行排序，以确保 seek 操作最高效
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

    try {
      await fs.mkdir(options.outputDir, { recursive: true });

      const command = ffmpeg(videoPath);
      const tempOutputPaths: string[] = [];
      const format = options.format ?? 'webp';

      // 为每个时间戳添加一个独立的输出配置
      sortedTimestamps.forEach((timestamp, index) => {
        // 创建一个可预测的临时文件名，如 temp_1.webp, temp_2.webp, ...
        const tempPath = path.join(options.outputDir, `temp_${index + 1}.${format}`);
        tempOutputPaths.push(tempPath);
        
        command
          .output(tempPath)
          .outputOptions([
            '-ss', timestamp.toString(), // 定位到指定时间
            '-vframes', '1',             // 只截取一帧
            '-vcodec', 'webp',           // 设置输出编解码器
            '-lossless', '1',
            '-q:v', '75'
          ]);
      });

      return new Promise<string[]>((resolve, reject) => {
        command
          .on('end', () => {
            // 所有截图任务在同一个进程中完成
            resolve(tempOutputPaths);
          })
          .on('error', (err) => {
            reject(new Error(`[ScreenshotGenerator] FFMpeg single-process with multiple outputs failed: ${err.message}`));
          })
          .run();
      });

    } catch (error) {
      console.error('[ScreenshotGenerator] An error occurred during multiple screenshot generation:', error);
      return []; // 确保在准备阶段出错时返回空数组
    }
  }

  

  public static async generateMultipleScreenshots2(
    videoPath: string,
    timestamps: number[],
    options: ScreenshotOptions
  ): Promise<string[]> {
    if (!timestamps || timestamps.length === 0) {
      return [];
    }
    // 对时间戳进行排序，以确保重命名时顺序正确
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

    try {
      await fs.mkdir(options.outputDir, { recursive: true });
      
      // 构建 select 滤镜，例如 'select=gte(t,10)+gte(t,20)+gte(t,30)'
      // 这会选择在每个时间点之后的第一帧
      const selectFilter = 'select=' + sortedTimestamps.map(t => `gte(t,${t})`).join('+');
      const format = options.format ?? 'webp';
      const tempOutputPathPattern = path.join(options.outputDir, `temp_%d.${format}`);
      const prefix = options.filenamePrefix ? `${options.filenamePrefix}_` : '';

      return new Promise<string[]>((resolve, reject) => {
        ffmpeg(videoPath)
          .outputOptions([
            '-vf', selectFilter, // 应用 select 滤镜
            '-vsync', 'vfr',     // 使用可变帧率以避免帧重复
            '-vframes', sortedTimestamps.length.toString() // 限制输出的总帧数
          ])
          .output(tempOutputPathPattern)
          .on('end', async () => {
            const finalPaths: string[] = [];
            try {
              // FFMpeg 会生成 temp_1.webp, temp_2.webp, ...
              // 现在将它们重命名为基于时间戳的最终文件名
              for (let i = 0; i < sortedTimestamps.length; i++) {
                const timestamp = sortedTimestamps[i];
                const tempPath = path.join(options.outputDir, `temp_${i + 1}.${format}`);
                
                const msTimestamp = Math.floor(timestamp * 1000);
                const finalFilename = `${prefix}${msTimestamp}.${format}`;
                const finalPath = path.join(options.outputDir, finalFilename);

                await fs.rename(tempPath, finalPath);
                finalPaths.push(finalPath);
              }
              resolve(finalPaths);
            } catch (renameError) {
              reject(new Error(`Failed to rename temporary screenshots: ${renameError}`));
            }
          })
          .on('error', (err) => {
            reject(new Error(`[ScreenshotGenerator] FFMpeg process failed: ${err.message}`));
          })
          .run();
      });
    } catch (error) {
      console.error('[ScreenshotGenerator] An error occurred during multiple screenshot generation:', error);
      return [];
    }
  }
}