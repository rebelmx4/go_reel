import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';
import log from 'electron-log';
import { calculateFastHash } from '../../utils/hash';

export interface FileProfile {
  path: string;      // 物理路径
  mtime: number;     // 修改时间 (用于校验缓存是否过期)
  size: number;      // 文件大小 (用于校验缓存是否过期)
  hash: string;      // 内容指纹
}

export interface ProfileShard {
  [normalizedPath: string]: FileProfile;
}

export class FileProfileManager {
  private baseDir: string;
  
  // 内存索引 1: ShardKey -> { Path -> Profile }
  private shards = new Map<string, ProfileShard>();
  
  // 内存索引 2: Hash -> Profile[] (反向索引，用于通过 Hash 找回所有路径)
  private hashToProfilesMap = new Map<string, FileProfile[]>();

  // 并发控制：记录正在计算 Hash 的 Promise，防止同一个文件被同时触发多次计算
  private pendingTasks = new Map<string, Promise<FileProfile | null>>();

  constructor() {
    this.baseDir = path.join(app.getAppPath(), 'data', 'file_profile');
    this.ensureDir();
  }

  private ensureDir() {
    try { fs.ensureDirSync(this.baseDir); } catch (e) { log.error(e); }
  }

  /**
   * 获取路径的唯一分片 Key (基于路径 MD5 的首位)
   */
  private getShardKey(filePath: string): string {
    const normalized = path.normalize(filePath).toLowerCase();
    return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 1);
  }

  /**
   * 初始化：加载磁盘上的 16 个分片到内存
   */
  public async init(): Promise<void> {
    for (let i = 0; i < 16; i++) {
      const key = i.toString(16);
      const shardPath = path.join(this.baseDir, `${key}.json`);
      let shardData: ProfileShard = {};

      if (await fs.pathExists(shardPath)) {
        try {
          shardData = await fs.readJson(shardPath);
          // 构建反向索引
          for (const profile of Object.values(shardData)) {
            this.addToHashMap(profile);
          }
        } catch (e) { log.error(`Load FileProfile shard ${key} failed`, e); }
      }
      this.shards.set(key, shardData);
    }
    log.info(`FileProfileManager: Initialized. Unique hashes: ${this.hashToProfilesMap.size}`);
  }

  /**
   * 【核心对外接口】通过路径获取档案
   * 如果没有 Hash 或文件已变动，则触发计算。
   */
  public async getProfile(filePath: string): Promise<FileProfile | null> {
    const normalized = path.normalize(filePath).toLowerCase();
    
    // 1. 获取物理状态
    let stats: fs.Stats;
    try {
      stats = await fs.stat(filePath);
    } catch (e) {
      // 文件不存在，清理可能存在的旧缓存
      this.removeProfile(filePath);
      return null;
    }

    // 2. 检查内存缓存
    const key = this.getShardKey(normalized);
    const shard = this.shards.get(key)!;
    const cached = shard[normalized];

    // 如果缓存存在且物理状态未改变，直接返回
    if (cached && cached.mtime === stats.mtimeMs && cached.size === stats.size) {
      return cached;
    }

    // 3. 并发控制：如果该文件正在计算 Hash，直接等待现有的 Promise
    if (this.pendingTasks.has(normalized)) {
      return this.pendingTasks.get(normalized)!;
    }

    // 4. 执行计算任务
    const calculateTask = (async () => {
      try {
        log.debug(`[FileProfile] Calculating hash for: ${filePath}`);
        const newHash = await calculateFastHash(filePath);
        
        const newProfile: FileProfile = {
          path: filePath,
          mtime: stats.mtimeMs,
          size: stats.size,
          hash: newHash
        };

        // 更新内存和磁盘
        await this.updateProfile(newProfile);
        return newProfile;
      } catch (e) {
        log.error(`[FileProfile] Hash calculation failed: ${filePath}`, e);
        return null;
      } finally {
        // 任务结束，从拦截 Map 中移除
        this.pendingTasks.delete(normalized);
      }
    })();

    this.pendingTasks.set(normalized, calculateTask);
    return calculateTask;
  }

  /**
   * 【对外接口】给一个 Hash，找回所有有效的物理文件档案
   */
  public async getValidProfilesByHash(hash: string): Promise<FileProfile[] | null> {
    const profiles = this.hashToProfilesMap.get(hash);
    if (!profiles || profiles.length === 0) return null;

    const validProfiles: FileProfile[] = [];

    // 并行校验该 Hash 关联的所有路径
    const checkTasks = profiles.map(async (profile) => {
      try {
        const stats = await fs.stat(profile.path);
        if (stats.mtimeMs === profile.mtime && stats.size === profile.size) {
          return profile;
        }
      } catch (e) {
        // 文件可能被移动或删除
      }
      return null;
    });

    const results = await Promise.all(checkTasks);
    for (const p of results) { if (p) validProfiles.push(p); }

    return validProfiles.length > 0 ? validProfiles : null;
  }

  // ====================================================================
  // 私有维护逻辑 (内部使用)
  // ====================================================================

  /**
   * 更新或新增档案到内存并持久化
   */
  private async updateProfile(profile: FileProfile): Promise<void> {
    const normalized = path.normalize(profile.path).toLowerCase();
    const key = this.getShardKey(normalized);
    const shard = this.shards.get(key)!;

    // 如果之前有旧 Hash，先移除反向索引
    const oldProfile = shard[normalized];
    if (oldProfile && oldProfile.hash !== profile.hash) {
      this.removeFromHashMap(oldProfile.hash, normalized);
    }

    // 更新内存索引
    shard[normalized] = profile;
    this.addToHashMap(profile);

    // 持久化分片
    await this.saveShard(key, shard);
  }

  /**
   * 移除档案 (当发现文件不存在时)
   */
  private async removeProfile(filePath: string): Promise<void> {
    const normalized = path.normalize(filePath).toLowerCase();
    const key = this.getShardKey(normalized);
    const shard = this.shards.get(key)!;

    const profile = shard[normalized];
    if (profile) {
      this.removeFromHashMap(profile.hash, normalized);
      delete shard[normalized];
      await this.saveShard(key, shard);
    }
  }

  private addToHashMap(profile: FileProfile) {
    const list = this.hashToProfilesMap.get(profile.hash) || [];
    if (!list.some(p => path.normalize(p.path).toLowerCase() === path.normalize(profile.path).toLowerCase())) {
      list.push(profile);
      this.hashToProfilesMap.set(profile.hash, list);
    }
  }

  private removeFromHashMap(hash: string, normalizedPath: string) {
    const list = this.hashToProfilesMap.get(hash);
    if (list) {
      const newList = list.filter(p => path.normalize(p.path).toLowerCase() !== normalizedPath);
      if (newList.length === 0) {
        this.hashToProfilesMap.delete(hash);
      } else {
        this.hashToProfilesMap.set(hash, newList);
      }
    }
  }

  private async saveShard(key: string, shardData: ProfileShard): Promise<void> {
    try {
      const shardPath = path.join(this.baseDir, `${key}.json`);
      await fs.writeJson(shardPath, shardData, { spaces: 0 });
    } catch (e) {
      log.error(`FileProfileManager: Failed to save shard ${key}:`, e);
    }
  }
}

export const fileProfileManager = new FileProfileManager();