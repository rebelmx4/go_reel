import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';

import { BaseAssetManager } from './BaseAssetManager';
import { storageManager } from '../json';
import { ScreenshotGenerator } from '../../utils/ScreenshotGenerator';

/**
 * 视频截图管理器
 * 负责截图的生成、加载、删除及导出
 */
export class ScreenshotManager extends BaseAssetManager {
  private readonly META_FILE = 'metadata.json';
  private readonly COLLAGE_NAME = 'storyboard_collage.webp';

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

  public async getMetadata(filePath: string): Promise<Record<string, any>> {
    try {
      const hash = await this.getHash(filePath);
      const metaPath = this.getFilePathInHash(hash, this.META_FILE);
      if (await fs.pathExists(metaPath)) {
        return await fs.readJson(metaPath);
      }
    } catch (error) {
      console.error('[ScreenshotManager] 读取 Metadata 失败:', error);
    }
    return {};
  }

  public async saveMetadata(filePath: string, metadata: Record<string, any>): Promise<void> {
    try {
      const hash = await this.getHash(filePath);
      const metaPath = this.getFilePathInHash(hash, this.META_FILE);
      await fs.writeJson(metaPath, metadata, { spaces: 2 });
    } catch (error) {
      console.error('[ScreenshotManager] 保存 Metadata 失败:', error);
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
      .filter((file) => file.endsWith('.webp') && file !== this.COLLAGE_NAME)
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

    const meta = await this.getMetadata(filePath);
    if (meta[filename]) {
      delete meta[filename];
      await this.saveMetadata(filePath, meta);
    }
  }

  /**
   * 导出截图到指定目录，并可选进行旋转
   * @param filePath 视频文件路径
   * @param rotation 旋转角度 (0, 90, 180, 270)
   */
  /**
 * 导出截图到指定目录
 * 修改点：仅导出 metadata.json 中 export 属性为 true (或默认) 的图片
 */
public async exportScreenshots(filePath: string, rotation: number): Promise<void> {
  const hash = await this.getHash(filePath);
  
  // 1. 获取元数据
  const meta = await this.getMetadata(filePath);
  
  const exportBaseDir = storageManager.getScreenshotExportPath();
  const targetDir = path.join(exportBaseDir, hash);
  
  // 2. 获取该目录下所有文件
  const files = await this.listFilesInHashDir(hash);

  for (const file of files) {
    // 排除元数据 JSON 文件本身
    if (file === this.META_FILE) continue;

    // 3. 核心逻辑：检查导出属性
    // 如果 JSON 中有记录且 export 为 false，则跳过
    // 如果 JSON 中没记录（默认），则视为 true，继续导出
    const sMeta = meta[file];
    if (sMeta && sMeta.export === false) {
      console.log(`[ScreenshotManager] 跳过导出 (用户已禁用): ${file}`);
      continue;
    }

    const src = this.getFilePathInHash(hash, file);
    const dest = path.join(targetDir, file);

    // 确保目标目录存在
    await fs.ensureDir(targetDir);

    if (rotation > 0) {
      // 如果有旋转角度，使用 sharp 处理后保存
      await sharp(src).rotate(rotation).toFile(dest);
    } else {
      // 无旋转则直接拷贝
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

   public async getStoryboardCollage(filePath: string): Promise<string | null> {
    const hash = await this.getHash(filePath);
    const fullPath = this.getFilePathInHash(hash, this.COLLAGE_NAME);
    if (await fs.pathExists(fullPath)) {
      return `file://${fullPath}?v=${Date.now()}`; // 增加随机后缀防止缓存
    }
    return null;
  }
}

export const screenshotManager = new ScreenshotManager();