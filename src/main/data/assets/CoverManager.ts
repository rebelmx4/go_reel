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

  // --- 私有辅助方法 (用于生成标准文件名, 保持不变) ---
  private getDefaultCoverFilename(hash: string): string {
    return `${hash}_d.webp`;
  }

  private getManualCoverFilename(hash:string): string {
    return `${hash}.webp`;
  }

  // ====================================================================
  // 对应 'get-cover' 和 'set-manual-cover' 句柄的核心业务逻辑
  // ====================================================================

  /**
   * [核心方法] 获取视频封面，实现了完整的三级回退逻辑。
   * @param hash - 视频哈希
   * @param videoPath - 视频文件的路径 (仅在需要生成封面时使用)
   * @returns 保证返回一个可用的 file:// 协议封面路径
   */
  public async getCover(hash: string | undefined | null, videoPath: string): Promise<string> {
    let effectiveHash = hash;

    // ✨ 2. 检查传入的 hash 是否无效 (null, undefined, or empty string)
    if (!effectiveHash) {
        // 如果无效，则立即使用视频路径进行计算
        console.warn(`[getCover] Hash was missing for video "${videoPath}". Calculating on the fly.`);
        try {
            effectiveHash = await calculateFastHash(videoPath);
        } catch (error) {
            console.error(`[getCover] Failed to calculate hash for "${videoPath}":`, error);
            // 在哈希计算失败时，可以返回一个默认的错误封面或抛出异常
            // 这里我们返回一个空字符串，让调用方处理
            return ''; 
        }
    }
    // 1 & 2: 优先检查已存在的手动或默认封面。
    // getCoverPath 已被重构，现在更简洁、更可靠。
    const existingPath = await this.getCoverPath(effectiveHash);
    if (existingPath) {
      return `file://${existingPath}`;
    }

    // 3. 如果都不存在，则生成、保存并返回新的默认封面。
    const newCoverPath = await this.generateDefaultCover(effectiveHash, videoPath);
    return `file://${newCoverPath}`;
  }

  /**
   * [核心方法] [已重构] 从一个指定的截图文件路径来设置手动封面。
   * @param hash - 视频哈希
   * @param sourcePath - 源截图文件的完整路径
   * @returns 保存后的手动封面的路径
   */
  public async setManualCoverFromPath(hash: string, sourcePath: string): Promise<string> {
    const data = await fs.readFile(sourcePath);
    const filename = this.getManualCoverFilename(hash);
    
    // **重构点**: 直接调用基类的 saveAsset 方法。
    // 无需再自己实现文件写入和路径拼接。
    return this.saveAsset(filename, data);
  }

  // ====================================================================
  // 内部辅助方法
  // ====================================================================

  /**
   * [已重构] 按优先级获取封面路径：手动 > 默认 > null。
   * @param hash - 视频哈希
   * @returns 封面的绝对路径，如果不存在则返回 null
   */
  public async getCoverPath(hash: string): Promise<string | null> {
    // **重构点**: 使用基类的 getAssetPath 方法，它内部处理了路径拼接和文件存在性检查。
    // 这使得代码非常简洁。
    
    // 1. 检查手动封面
    const manualPath = await this.getAssetPath(this.getManualCoverFilename(hash));
    if (manualPath) {
      return manualPath;
    }

    // 2. 检查默认封面
    // getAssetPath 会返回完整路径或 null，正是我们所需要的。
    return this.getAssetPath(this.getDefaultCoverFilename(hash));
  }
  
  /**
   * [已重构] 生成并保存默认封面 (在视频20%处截图)。
   * @param hash - 视频哈希
   * @param videoPath - 视频文件路径
   * @returns 生成的默认封面的路径
   */
  private async generateDefaultCover(hash: string, videoPath: string): Promise<string> {
    try {
      const duration = await ScreenshotGenerator.getVideoDuration(videoPath);
      const timestamp = duration * 0.2;

      // **重构点**: 使用基类的 this.baseDir 属性作为输出目录。
      // BaseAssetManager 保证了这个目录的存在。
      const tempPath = await ScreenshotGenerator.generateScreenshotAtTimestamp(
        videoPath,
        timestamp,
        this.baseDir  
      );

      const finalFilename = this.getDefaultCoverFilename(hash);
      
      // **重构点**: 使用基类的 getFlatPath 来构建最终目标路径。
      // 这确保了路径构建逻辑与 saveAsset/getAssetPath 等方法完全一致。
      const finalPath = this.getFlatPath(finalFilename);
      
      await fs.rename(tempPath, finalPath);
      
      console.log(`[CoverManager] Default cover generated for ${hash}`);
      return finalPath;

    } catch (error) {
      console.error(`[CoverManager] Failed to generate default cover for ${hash}:`, error);
      throw new Error(`Failed to generate default cover for hash: ${hash}`);
    }
  }

  // **重构点**: 以下两个方法被完全移除，因为它们的功能已由 BaseAssetManager 提供
  // private async assetExists(...) { ... } // -> 由 getAssetPath(fileName) !== null 替代
  // private async saveAsset(...) { ... }   // -> 由 this.saveAsset(fileName, data) 替代
}

export const coverManager = new CoverManager();