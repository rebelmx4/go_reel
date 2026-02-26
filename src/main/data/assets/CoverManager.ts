import fs from 'fs-extra'
import { BaseAssetManager } from './BaseAssetManager'
import { ScreenshotGenerator } from '../../utils/ScreenshotGenerator'
import log from 'electron-log'

export class CoverManager extends BaseAssetManager {
  constructor() {
    super('covers')
  }

  /**
   * 获取封面文件的完整绝对路径
   * 结构: baseDir/ab/abcdefg...webp
   */
  private getCoverPath(hash: string): string {
    return this.getFilePathInPrefix(hash, `${hash}.webp`)
  }

  /**
   *
   * [核心方法] 获取视频封面
   * 逻辑：检查是否存在 -> 存在则返回 -> 不存在则生成并返回
   * @param videoPath - 视频文件的原始物理路径
   * @returns 保证返回一个 file:// 协议的路径或空字符串
   */
  public async getCover(videoPath: string): Promise<string> {
    try {
      const hash = await this.getHash(videoPath)
      const coverPath = this.getCoverPath(hash)

      // 1. 检查物理文件是否存在
      if (await this.exists(coverPath)) {
        return `file://${coverPath}`
      }

      // 2. 如果不存在，则生成封面
      log.info(`[CoverManager] Generating new cover for: ${hash}`)
      const newCoverPath = await this.generateCover(hash, videoPath)
      return `file://${newCoverPath}`
    } catch (error) {
      log.error(`[CoverManager] getCover failed for ${videoPath}:`, error)
      return ''
    }
  }

  /**
   * [核心方法] 手动设置封面
   * 逻辑：将外部图片拷贝并覆盖现有的封面文件
   * @param videoPath - 视频路径（用于锁定Hash）
   * @param sourceImagePath - 用户选择的图片路径
   */
  public async setManualCoverFromPath(
    videoPath: string,
    sourceImagePath: string
  ): Promise<boolean> {
    try {
      const hash = await this.getHash(videoPath)
      const targetPath = this.getCoverPath(hash)

      // 直接覆盖旧文件
      await fs.copy(sourceImagePath, targetPath)

      log.info(`[CoverManager] Manual cover updated: ${targetPath}`)
      return true
    } catch (error) {
      log.error(`[CoverManager] Failed to set manual cover:`, error)
      return false
    }
  }

  /**
   * 内部逻辑：生成封面
   * 默认在视频 20% 处截取
   */
  private async generateCover(hash: string, videoPath: string): Promise<string> {
    const targetPath = this.getCoverPath(hash)

    try {
      const duration = await ScreenshotGenerator.getVideoDuration(videoPath)
      const timestamp = duration * 0.2

      await ScreenshotGenerator.generateScreenshotAtTimestamp(videoPath, timestamp, targetPath)

      return targetPath
    } catch (error) {
      log.error(`[CoverManager] FFmpeg generation failed for ${hash}:`, error)
      throw error
    }
  }

  /**
   * 删除封面
   * @param hash - 视频哈希
   */
  public async deleteCover(hash: string): Promise<void> {
    const targetPath = this.getCoverPath(hash)
    await this.delete(targetPath)
  }
}

export const coverManager = new CoverManager()
