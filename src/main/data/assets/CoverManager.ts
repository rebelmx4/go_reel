// src/data/assets/CoverManager.ts

import * as fs from 'fs/promises';
import { BaseAssetManager } from './BaseAssetManager';
import { ScreenshotGenerator } from '../../utils/ScreenshotGenerator';
import { calculateFastHash } from '../../utils/hash';

export class CoverManager extends BaseAssetManager {
  constructor() {
    // 'covers' 目录将由 BaseAssetManager 的构造函数自动创建和管理
    super('covers');
  }

  // --- 私有辅助方法 (用于生成标准文件名) ---
  private getDefaultCoverFilename(hash: string): string {
    return `${hash}_d.webp`;
  }

  private getManualCoverFilename(hash:string): string {
    return `${hash}.webp`;
  }

  // ====================================================================
  // 核心业务逻辑
  // ====================================================================

  /**
   * [核心方法] 获取视频封面，实现了完整的三级回退逻辑。
   * @param hash - 视频哈希
   * @param videoPath - 视频文件的路径 (仅在需要生成封面时使用)
   * @returns 保证返回一个可用的 file:// 协议封面路径
   */
  public async getCover(hash: string | undefined | null, videoPath: string): Promise<string> {
    let effectiveHash = hash;

    // 1. 容错处理：如果没有 Hash，现场计算
    if (!effectiveHash) {
        console.warn(`[getCover] Hash was missing for video "${videoPath}". Calculating on the fly.`);
        try {
            effectiveHash = await calculateFastHash(videoPath);
        } catch (error) {
            console.error(`[getCover] Failed to calculate hash for "${videoPath}":`, error);
            return ''; 
        }
    }

    // 2. 检查已存在的手动或默认封面
    const existingPath = await this.getCoverPath(effectiveHash);
    if (existingPath) {
      return `file://${existingPath}`;
    }

    // 3. 如果都不存在，则生成、保存并返回新的默认封面
    try {
        const newCoverPath = await this.generateDefaultCover(effectiveHash, videoPath);
        return `file://${newCoverPath}`;
    } catch (e) {
        console.error(`[getCover] Failed to generate default cover:`, e);
        return '';
    }
  }

  /**
   * [核心方法] 从一个指定的截图文件路径来设置手动封面。
   * [优化] 使用 copyFile 替代 readFile + saveAsset，效率更高
   */
  public async setManualCoverFromPath(hash: string, sourcePath: string): Promise<boolean> {
    const filename = this.getManualCoverFilename(hash);
    
    // 获取目标文件的绝对路径
    const targetPath = this.getFlatPath(filename);
    
    // 使用文件系统级别的拷贝，比读入 Buffer 再写入更快且省内存
    await fs.copyFile(sourcePath, targetPath);
    
    return true;
  }

  // ====================================================================
  // 内部辅助方法
  // ====================================================================

  /**
   * 按优先级获取封面路径：手动 > 默认 > null。
   */
  public async getCoverPath(hash: string): Promise<string | null> {
    // 1. 检查手动封面
    const manualPath = await this.getAssetPath(this.getManualCoverFilename(hash));
    if (manualPath) {
      return manualPath;
    }

    // 2. 检查默认封面
    return this.getAssetPath(this.getDefaultCoverFilename(hash));
  }
  
  /**
   * [优化] 生成并保存默认封面 (在视频20%处截图)。
   * 修复点：直接生成最终文件名，不再使用 rename
   */
  private async generateDefaultCover(hash: string, videoPath: string): Promise<string> {
    try {
      // 1. 获取时间点
      const duration = await ScreenshotGenerator.getVideoDuration(videoPath);
      const timestamp = duration * 0.2;

      // 2. 预先构建最终的输出路径
      const finalFilename = this.getDefaultCoverFilename(hash);
      const finalPath = this.getFlatPath(finalFilename);
      
      // 3. 直接调用生成器，输出到最终路径
      // ScreenshotGenerator 会自动处理目录创建（虽然 BaseAssetManager 应该已经创建了目录）
      await ScreenshotGenerator.generateScreenshotAtTimestamp(
        videoPath,
        timestamp,
        finalPath // 直接传入完整路径
      );

      // 4. 不再需要 fs.rename
      
      console.log(`[CoverManager] Default cover generated for ${hash}`);
      return finalPath;

    } catch (error) {
      console.error(`[CoverManager] Failed to generate default cover for ${hash}:`, error);
      throw error;
    }
  }
}

export const coverManager = new CoverManager();