import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { BaseAssetManager } from './BaseAssetManager';
import { settingsManager }  from '../json/SettingsManager';
import { ScreenshotGenerator } from '../../utils/ScreenshotGenerator'; 

// 定义了 'load-screenshots' 返回的截图对象结构
export interface Screenshot {
  filename: string;
  timestamp: number;
  path: string;
  type: 'manual' | 'auto';
}

export class ScreenshotManager extends BaseAssetManager {
  constructor() {
    // 'screenshots' 是存储截图的根目录名
    super('screenshots');
  }

 
  /**
   * 从视频文件为指定时间戳创建一张手动截图。
   * @param hash - 视频哈希
   * @param videoPath - 原始视频文件路径
   * @param timestampInSeconds - 截图所在的时间点（秒）
   * @returns 成功则返回 true，否则返回 false
   */
  public async createManualScreenshot(hash: string, videoPath: string, timestampInSeconds: number): Promise<boolean> {
    const dir = this.getHashBasedDir(hash);
    
    try {
      // 1. 使用工具类生成一张带有临时名字的截图
      const tempPath = await ScreenshotGenerator.generateScreenshotAtTimestamp(videoPath, timestampInSeconds, dir);

      // 2. 根据我们的业务规则重命名文件
      const msTimestamp = Math.floor(timestampInSeconds * 1000);
      const finalFilename = `${msTimestamp}_m.webp`;
      const finalPath = path.join(dir, finalFilename);
      
      await fs.rename(tempPath, finalPath);
      
      console.log(`[Manual Screenshot Manager] Successfully created screenshot for ${hash} at ${timestampInSeconds}s.`);
      return true;
    } catch (error) {
      console.error(`[Manual Screenshot Manager] Failed for ${hash}:`, error);
      return false;
    }
  }

  /**
   * 为视频自动生成9张截图（如果尚不存在）。
   * 此方法经过重构，使用单次 FFMpeg 调用，性能更高。
   * @param hash - 视频哈希
   * @param videoPath - 原始视频文件路径
   * @returns 如果成功生成或已存在，返回 true，否则返回 false
   */
  public async generateAutoScreenshots(hash: string, videoPath: string): Promise<boolean> {
    if (await this.hasScreenshots(hash)) {
      console.log(`[Auto Screenshot Manager] Screenshots already exist for ${hash}. Skipping.`);
      return true;
    }

    const dir = this.getHashBasedDir(hash);

    try {
      // 1. 获取视频时长
      const duration = await ScreenshotGenerator.getVideoDuration(videoPath);
      if (duration <= 0) {
        throw new Error('Could not determine a valid video duration.');
      }

      // 2. 计算9个截图的时间点，并排序
      const interval = duration / 10;
      const timestamps = Array.from({ length: 9 }, (_, i) => interval * (i + 1)).sort((a, b) => a - b);
      
       const startTime = performance.now();
      // 3. 一次性生成所有截图（它们的文件名是临时的，如 temp_1.webp, temp_2.webp...）
      const tempScreenshotPaths = await ScreenshotGenerator.generateMultipleScreenshots(videoPath, timestamps, { outputDir: dir });
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      console.log(`平均每张耗时: ${(totalDuration  / tempScreenshotPaths.length).toFixed(2)}ms`);

      if (tempScreenshotPaths.length !== timestamps.length) {
          throw new Error('Mismatch between requested and generated screenshots.');
      }

      // 4. 将所有临时文件重命名为符合业务规范的最终文件名
      const renamePromises = tempScreenshotPaths.map((tempPath, index) => {
        const timestamp = timestamps[index]; // 按顺序一一对应
        const msTimestamp = Math.floor(timestamp * 1000);
        const finalFilename = `${msTimestamp}_a.webp`;
        const finalPath = path.join(dir, finalFilename);
        return fs.rename(tempPath, finalPath);
      });

      await Promise.all(renamePromises);

      console.log(`[Auto Screenshot Manager] Successfully generated 9 screenshots for ${hash} in a single process.`);
      return true;

    } catch (error) {
      console.error(`[Auto Screenshot Manager] Failed to generate screenshots for ${hash}:`, error);
      return false;
    }
  }

  /**
   * 加载指定视频的所有截图信息
   * @param hash - 视频哈希
   * @returns 截图对象数组
   */
  public async loadScreenshots(hash: string): Promise<Screenshot[]> {
    try {
      const files = await this.listHashBasedFiles(hash);
      const screenshots: Screenshot[] = [];
      
      for (const file of files) {
        const match = file.match(/^(\d+)_(m|a)\.webp$/);
        if (match) {
          const absolutePath = this.getHashBasedPath(hash, file);
          screenshots.push({
            filename: file,
            timestamp: parseInt(match[1], 10),
            path: `file://${absolutePath}`, // 为渲染进程提供可以访问的 file协议 路径
            type: match[2] === 'm' ? 'manual' : 'auto'
          });
        }
      }
      
      // 按时间戳排序
      screenshots.sort((a, b) => a.timestamp - b.timestamp);
      
      return screenshots;
    } catch (error) {
      // 目录不存在或其他读取错误
      return [];
    }
  }

  /**
   * 删除一张截图
   * @param hash - 视频哈希
   * @param filename - 要删除的截图文件名
   */
  public async deleteScreenshot(hash: string, filename: string): Promise<void> {
    return this.deleteHashBasedFile(hash, filename);
  }

  /**
   * 导出指定视频的所有截图到外部路径，并应用旋转。
   * @param hash - 视频的哈希值
   * @param rotation - 顺时针旋转角度。支持的值为 90、180、270。
   * @param exportPath - 导出的目标目录路径
   */
  public async exportScreenshots(hash: string, rotation: number): Promise<void> {
    const exportPath = settingsManager.getScreenshotExportPath();

    const targetDir = path.join(exportPath, hash);
    await fs.mkdir(targetDir, { recursive: true });
    
    const screenshots = await this.listHashBasedFiles(hash);
    
    for (const file of screenshots) {
      if (file.endsWith('.webp')) {
        const sourcePath = this.getHashBasedPath(hash, file);
        const targetPath = path.join(targetDir, file);
        
        try {
          // 当旋转角度为 0 或其他无效值时，将跳过旋转处理。
          if (rotation > 0 && [90, 180, 270].includes(rotation)) {
            // 使用 sharp 库应用顺时针旋转，并保存到目标路径。
            await sharp(sourcePath)
              .rotate(rotation)
              .toFile(targetPath);
          } else {
            // 如果不需要旋转，直接复制文件。
            await fs.copyFile(sourcePath, targetPath);
          }
        } catch (error) {
            console.error(`处理或复制截图 ${file} 时失败:`, error);
            // 即使单个文件处理失败，也继续处理下一个文件。
        }
      }
    }
  }
  
  /**
   * 检查视频是否已存在任何截图
   * @param hash - 视频哈希
   * @returns 如果存在截图则返回 true
   */
  public async hasScreenshots(hash: string): Promise<boolean> {
    try {
      const files = await this.listHashBasedFiles(hash);
      // 仅当找到 .webp 文件时才返回 true
      return files.some(f => f.endsWith('.webp'));
    } catch {
      return false;
    }
  }
}


export const screenshotManager = new ScreenshotManager();