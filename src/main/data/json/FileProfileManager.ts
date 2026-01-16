import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import log from 'electron-log';
import { BaseShardedJsonManager } from './BaseShardedJsonManager';
import { calculateFastHash } from '../../utils/hash';

export interface FileProfile {
  path: string;      // 物理路径
  mtime: number;     // 修改时间
  size: number;      // 文件大小
  hash: string;      // 内容指纹
}

export class FileProfileManager extends BaseShardedJsonManager<FileProfile> {
  // 反向索引：Hash -> Profile[] (内存中维护，不持久化，启动时根据分片重建)
  private hashToProfilesMap = new Map<string, FileProfile[]>();
  // 并发控制
  private pendingTasks = new Map<string, Promise<FileProfile | null>>();

  constructor() {
    super('file_profile');
  }

  /**
   * 重写分片键算法：基于路径 MD5
   */
  protected getShardKey(filePath: string): string {
    const normalized = path.normalize(filePath).toLowerCase();
    return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 1);
  }

  /**
   * 重写初始化：加载完分片后，构建反向索引
   */
  public async init(): Promise<void> {
    await super.init();
    
    this.hashToProfilesMap.clear();
    for (const shard of this.shards.values()) {
      for (const profile of Object.values(shard)) {
        this.addToHashMap(profile);
      }
    }
    log.info(`FileProfileManager: Reverse index built. Unique hashes: ${this.hashToProfilesMap.size}`);
  }

  /**
   * 核心接口：获取档案
   */
  public async getProfile(filePath: string): Promise<FileProfile | null> {
    const normalized = path.normalize(filePath).toLowerCase();

    // 1. 检查物理状态
    let stats: fs.Stats;
    try {
      stats = await fs.stat(filePath);
    } catch (e) {
      await this.deleteProfile(filePath);
      return null;
    }

    // 2. 检查缓存
    const cached = this.getItem(normalized);
    if (cached && cached.mtime === stats.mtimeMs && cached.size === stats.size) {
      return cached;
    }

    // 3. 并发控制
    if (this.pendingTasks.has(normalized)) {
      return this.pendingTasks.get(normalized)!;
    }

    const task = (async () => {
      try {
        log.debug(`[FileProfile] Calculating hash for: ${filePath}`);
        const newHash = await calculateFastHash(filePath);
        const newProfile: FileProfile = {
          path: filePath,
          mtime: stats.mtimeMs,
          size: stats.size,
          hash: newHash
        };

        await this.updateProfile(newProfile);
        return newProfile;
      } catch (e) {
        log.error(`[FileProfile] Hash calculation failed: ${filePath}`, e);
        return null;
      } finally {
        this.pendingTasks.delete(normalized);
      }
    })();

    this.pendingTasks.set(normalized, task);
    return task;
  }


  private async updateProfile(profile: FileProfile): Promise<void> {
    const normalized = path.normalize(profile.path).toLowerCase();
    
    // 处理旧 Hash 的反向索引移除
    const old = this.getItem(normalized);
    if (old && old.hash !== profile.hash) {
      this.removeFromHashMap(old.hash, normalized);
    }

    await this.setItem(normalized, profile);
    this.addToHashMap(profile);
  }

  private async deleteProfile(filePath: string): Promise<void> {
    const normalized = path.normalize(filePath).toLowerCase();
    const old = this.getItem(normalized);
    if (old) {
      this.removeFromHashMap(old.hash, normalized);
      await this.deleteItem(normalized);
    }
  }

  private addToHashMap(profile: FileProfile) {
    const list = this.hashToProfilesMap.get(profile.hash) || [];
    const normalizedPath = path.normalize(profile.path).toLowerCase();
    if (!list.some(p => path.normalize(p.path).toLowerCase() === normalizedPath)) {
      list.push(profile);
      this.hashToProfilesMap.set(profile.hash, list);
    }
  }

  private removeFromHashMap(hash: string, normalizedPath: string) {
    const list = this.hashToProfilesMap.get(hash);
    if (list) {
      const newList = list.filter(p => path.normalize(p.path).toLowerCase() !== normalizedPath);
      if (newList.length === 0) this.hashToProfilesMap.delete(hash);
      else this.hashToProfilesMap.set(hash, newList);
    }
  }
}

export const fileProfileManager = new FileProfileManager();