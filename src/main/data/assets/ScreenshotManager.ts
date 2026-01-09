// --- START OF FILE ScreenshotManager.ts ---

import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { BaseAssetManager } from './BaseAssetManager';
import { settingsManager }  from '../json/SettingsManager';
import { ScreenshotGenerator } from '../../utils/ScreenshotGenerator'; 

export interface Screenshot {
  filename: string;
  timestamp: number;
  path: string;
  type: 'manual' | 'auto';
}

export class ScreenshotManager extends BaseAssetManager {
  constructor() {
    super('screenshots');
  }

  /**
   * 手动截图
   * [优化] 直接生成最终文件名，无需重命名
   */
  public async createManualScreenshot(hash: string, videoPath: string, timestampInSeconds: number): Promise<boolean> {
    const dir = this.getHashBasedDir(hash);
    
    try {
      // 1. 预先计算最终路径： {timestamp}_m.webp
      const msTimestamp = Math.floor(timestampInSeconds * 1000);
      const finalFilename = `${msTimestamp}_m.webp`;
      const finalPath = path.join(dir, finalFilename);

      // 2. 直接告诉生成器生成这个文件
      await ScreenshotGenerator.generateScreenshotAtTimestamp(videoPath, timestampInSeconds, finalPath);

      console.log(`[Manual Screenshot] Success: ${finalPath}`);
      return true;
    } catch (error) {
      console.error(`[Manual Screenshot] Failed for ${hash}:`, error);
      return false;
    }
  }

  /**
   * 自动截图 (9张)
   * [优化] 利用 C++ 模板功能直接生成 _a 后缀的文件，无需重命名循环
   */
  private async generateAutoScreenshots(hash: string, videoPath: string): Promise<boolean> {
    if (await this.hasScreenshots(hash)) {
      console.log(`[Auto Screenshot] Exists for ${hash}. Skipping.`);
      return true;
    }

    const dir = this.getHashBasedDir(hash);

    try {
      // 1. 获取时长并计算时间点
      const duration = await ScreenshotGenerator.getVideoDuration(videoPath);
      if (duration <= 0) throw new Error('Invalid video duration.');

      const interval = duration / 10;
      const timestamps = Array.from({ length: 9 }, (_, i) => interval * (i + 1)).sort((a, b) => a - b);
      
      const startTime = performance.now();
      
      // 2. [关键修改] 传入 filenamePattern: '%ms_a'
      // C++ 会自动将 %ms 替换为时间戳，生成如 "12345_a.webp" 的文件
      const generatedPaths = await ScreenshotGenerator.generateMultipleScreenshots(
        videoPath, 
        timestamps, 
        { 
          outputDir: dir,
          filenamePattern: '%ms_a' // 这里指定生成的格式为 {时间戳}_a
        }
      );

      const endTime = performance.now();
      console.log(`[Auto Screenshot] Generated 9 images in ${(endTime - startTime).toFixed(2)}ms`);

      if (generatedPaths.length !== timestamps.length) {
          throw new Error('Mismatch between requested and generated screenshots.');
      }

      // 3. 以前这里需要遍历 rename，现在完全不需要了！
      
      return true;

    } catch (error) {
      console.error(`[Auto Screenshot] Failed for ${hash}:`, error);
      return false;
    }
  }

  
  public async loadScreenshots(hash: string, filePath: string): Promise<Screenshot[]> {
    try {
      let files = await this.listHashBasedFiles(hash);
      const screenshots: Screenshot[] = [];
      
      // ✨ 关键逻辑：如果发现没有截图，自动触发生成，但不阻塞当前返回
    //   if (files.length === 0) {
    //   console.log(`[ScreenshotManager] Generating screenshots for ${hash}...`);
    //   const success = await this.generateAutoScreenshots(hash, filePath);
    //   if (success) {
    //     // 生成成功后重新获取文件列表
    //     files = await this.listHashBasedFiles(hash);
    //   } else {
    //     return []; // 生成失败
    //   }
    // }
      
      for (const file of files) {
        const match = file.match(/^(\d+)_(m|a)\.webp$/);
        if (match) {
          const absolutePath = this.getHashBasedPath(hash, file);
          screenshots.push({
            filename: file,
            timestamp: parseInt(match[1], 10),
            path: `file://${absolutePath}`, 
            type: match[2] === 'm' ? 'manual' : 'auto'
          });
        }
      }
      
      screenshots.sort((a, b) => a.timestamp - b.timestamp);
      return screenshots;
    } catch (error) {
      return [];
    }
  }

  public async deleteScreenshot(hash: string, filename: string): Promise<void> {
    return this.deleteHashBasedFile(hash, filename);
  }

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
          if (rotation > 0 && [90, 180, 270].includes(rotation)) {
            await sharp(sourcePath).rotate(rotation).toFile(targetPath);
          } else {
            await fs.copyFile(sourcePath, targetPath);
          }
        } catch (error) {
            console.error(`Export error ${file}:`, error);
        }
      }
    }
  }
  
  public async hasScreenshots(hash: string): Promise<boolean> {
    try {
      const files = await this.listHashBasedFiles(hash);
      return files.some(f => f.endsWith('.webp'));
    } catch {
      return false;
    }
  }
}

export const screenshotManager = new ScreenshotManager();