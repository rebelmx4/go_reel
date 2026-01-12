
import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';
import { ScreenshotGenerator } from '../../utils/ScreenshotGenerator';
import { fileProfileManager } from './FileProfileManager';
import { VideoMetadata } from '../../../shared/models';

export interface VideoMetadataShard {
  [hash: string]: VideoMetadata;
}

export class VideoMetadataManager {
  private baseDir: string;
  // 内存索引: ShardKey (0-f) -> { Hash -> Metadata }
  private shards = new Map<string, VideoMetadataShard>();
  // 并发控制：记录正在提取的 Hash，防止相同内容的多个文件同时触发 FFmpeg
  private pendingTasks = new Map<string, Promise<VideoMetadata | null>>();

  constructor() {
    this.baseDir = path.join(app.getAppPath(), 'data', 'video_metadata');
    this.ensureDir();
  }

  private ensureDir() {
    try { fs.ensureDirSync(this.baseDir); } catch (e) { log.error(e); }
  }

  /**
   * 基于 Hash 的首位进行分片
   */
  private getShardKey(hash: string): string {
    return hash.substring(0, 1).toLowerCase();
  }

  public async init(): Promise<void> {
    for (let i = 0; i < 16; i++) {
      const key = i.toString(16);
      const shardPath = path.join(this.baseDir, `${key}.json`);
      let shardData: VideoMetadataShard = {};

      if (await fs.pathExists(shardPath)) {
        try {
          shardData = await fs.readJson(shardPath);
        } catch (e) { log.error(`Load VideoMetadata shard ${key} failed`, e); }
      }
      this.shards.set(key, shardData);
    }
    log.info(`VideoMetadataManager: Initialized.`);
  }

  /**
   * 获取视频元数据 (核心接口)
   */
  public async getVideoMetadata(filePath: string): Promise<VideoMetadata | null> {
    // 1. 获取文件的 Profile (拿 Hash)
    const profile = await fileProfileManager.getProfile(filePath);
    if (!profile) return null;

    const hash = profile.hash;
    const shardKey = this.getShardKey(hash);
    const shard = this.shards.get(shardKey)!;

    // 2. 检查缓存
    if (shard[hash]) {
      return shard[hash];
    }

    // 3. 并发控制
    if (this.pendingTasks.has(hash)) {
      return this.pendingTasks.get(hash)!;
    }

    // 4. 执行 FFmpeg 提取任务
    const task = (async () => {
      try {
        log.debug(`[VideoMetadata] Extracting metadata for hash: ${hash} (path: ${filePath})`);
        const metadata = await ScreenshotGenerator.getVideoMetadata(filePath);
        
        // 如果提取失败（例如时长为0），不进入持久化缓存
        if (metadata && metadata.duration > 0) {
          await this.updateMetadata(hash, metadata);
          return metadata;
        }
        return metadata;
      } catch (e) {
        log.error(`[VideoMetadata] Extraction failed: ${filePath}`, e);
        return null;
      } finally {
        this.pendingTasks.delete(hash);
      }
    })();

    this.pendingTasks.set(hash, task);
    return task;
  }

  private async updateMetadata(hash: string, metadata: VideoMetadata): Promise<void> {
    const key = this.getShardKey(hash);
    const shard = this.shards.get(key)!;

    shard[hash] = metadata;
    await this.saveShard(key, shard);
  }

  private async saveShard(key: string, shardData: VideoMetadataShard): Promise<void> {
    try {
      const shardPath = path.join(this.baseDir, `${key}.json`);
      await fs.writeJson(shardPath, shardData, { spaces: 0 });
    } catch (e) {
      log.error(`VideoMetadataManager: Failed to save shard ${key}:`, e);
    }
  }
}

export const videoMetadataManager = new VideoMetadataManager();