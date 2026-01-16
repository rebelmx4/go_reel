import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';

import { BaseAssetManager } from './BaseAssetManager';
import { settingsManager } from '../json/SettingsManager';
import { ScreenshotGenerator } from '../../utils/ScreenshotGenerator';

/**
 * 视频截图管理器
 * 负责截图的生成、加载、删除及导出
 */
export class ScreenshotManager extends BaseAssetManager {
  constructor() {
    super('screenshots');
  }

  /**
   * 手动创建视频截图
   * @param videoPath 视频文件路径
   * @param timestamp 截图时间点（秒）
   */
  public async createManualScreenshot(videoPath: string, timestamp: number): Promise<boolean> {
    try {
      const hash = await this.getHash(videoPath);
      // 将时间戳转为毫秒并补齐位数，作为文件名（便于排序）
      const filename = `${Math.floor(timestamp * 1000).toString().padStart(8, '0')}.webp`;
      const savePath = this.getFilePathInHash(hash, filename);

      await ScreenshotGenerator.generateScreenshotAtTimestamp(videoPath, timestamp, savePath);
      return true;
    } catch (error) {
      console.error(`[ScreenshotManager] 截图生成失败: ${videoPath}`, error);
      return false;
    }
  }

  /**
   * 加载指定视频的所有截图
   * @param filePath 视频文件路径
   */
  public async loadScreenshots(filePath: string) {
    const hash = await this.getHash(filePath);
    const files = await this.listFilesInHashDir(hash);

    return files
      .filter((file) => file.endsWith('.webp'))
      .map((file) => ({
        filename: file,
        timestamp: parseInt(path.parse(file).name, 10) || 0,
        path: `file://${this.getFilePathInHash(hash, file)}`,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 删除特定截图
   * @param filePath 视频文件路径
   * @param filename 截图文件名
   */
  public async deleteScreenshot(filePath: string, filename: string): Promise<void> {
    const hash = await this.getHash(filePath);
    const targetPath = this.getFilePathInHash(hash, filename);
    await this.delete(targetPath);
  }

  /**
   * 导出截图到指定目录，并可选进行旋转
   * @param filePath 视频文件路径
   * @param rotation 旋转角度 (0, 90, 180, 270)
   */
  public async exportScreenshots(filePath: string, rotation: number): Promise<void> {
    const hash = await this.getHash(filePath);
    const exportBaseDir = settingsManager.getScreenshotExportPath();
    const targetDir = path.join(exportBaseDir, hash);
    
    await fs.ensureDir(targetDir);

    const files = await this.listFilesInHashDir(hash);

    for (const file of files) {
      const src = this.getFilePathInHash(hash, file);
      const dest = path.join(targetDir, file);

      if (rotation > 0) {
        // 如果有旋转角度，使用 sharp 处理后保存
        await sharp(src).rotate(rotation).toFile(dest);
      } else {
        // 无旋转则直接拷贝，效率更高
        await fs.copy(src, dest);
      }
    }
  }

  /**
   * 检查该哈希目录下是否存在截图
   * @param hash 视频哈希值
   */
  public async hasScreenshots(hash: string): Promise<boolean> {
    const files = await this.listFilesInHashDir(hash);
    return files.some((f) => f.endsWith('.webp'));
  }
}

export const screenshotManager = new ScreenshotManager();