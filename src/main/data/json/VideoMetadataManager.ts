import log from 'electron-log'
import { BaseShardedJsonManager } from './BaseShardedJsonManager'
import { ScreenshotGenerator } from '../../utils/ScreenshotGenerator'
import { fileProfileManager } from './FileProfileManager'
import { VideoMetadata } from '../../../shared'

export class VideoMetadataManager extends BaseShardedJsonManager<VideoMetadata> {
  // 并发控制：防止同一个 Hash 被同时提取多次
  private pendingTasks = new Map<string, Promise<VideoMetadata | null>>()

  constructor() {
    super('video_metadata')
  }

  /**
   * 获取视频元数据
   * @param filePath 物理路径（用于提取和获取 Hash）
   */
  public async getVideoMetadata(filePath: string): Promise<VideoMetadata | null> {
    // 1. 获取文件的 Hash
    const profile = await fileProfileManager.getProfile(filePath)
    if (!profile) return null

    const hash = profile.hash

    // 2. 从分片缓存中读取
    const cached = this.getItem(hash)
    if (cached) return cached

    // 3. 检查是否正在提取中
    if (this.pendingTasks.has(hash)) {
      return this.pendingTasks.get(hash)!
    }

    // 4. 执行提取任务
    const task = (async () => {
      try {
        log.debug(`[VideoMetadata] Extracting metadata for: ${hash}`)
        const metadata = await ScreenshotGenerator.getVideoMetadata(filePath)

        if (metadata && metadata.duration > 0) {
          // 存入分片 JSON
          await this.setItem(hash, metadata)
          return metadata
        }
        return null
      } catch (e) {
        log.error(`[VideoMetadata] Extraction failed: ${filePath}`, e)
        return null
      } finally {
        this.pendingTasks.delete(hash)
      }
    })()

    this.pendingTasks.set(hash, task)
    return task
  }
}

export const videoMetadataManager = new VideoMetadataManager()
