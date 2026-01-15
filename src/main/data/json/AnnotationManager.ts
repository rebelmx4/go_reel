import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';

import { Annotation, DEFAULT_ANNOTATION } from '../../../shared/models';// 引入共享类型

/** 分片字典对象 */
export interface AnnotationShard {
  [hash: string]: Annotation;
}

export class AnnotationManager {
  private baseDir: string;
  // 内存结构：ShardKey (0-f) -> 该分片内的所有 Hash 数据
  private shards = new Map<string, AnnotationShard>();
  private isInitialized = false;

  constructor() {
    this.baseDir = path.join(app.getAppPath(), 'data', 'Annotation');
    this.ensureDir();
  }

  private ensureDir() {
    try { fs.ensureDirSync(this.baseDir); } catch (e) { log.error(e); }
  }

  /** 获取 Hash 的首位作为分片 Key (0-f) */
  private getShardKey(hash: string): string {
    return hash.substring(0, 1).toLowerCase();
  }

  /**
   * 初始化：启动时加载 16 个分片
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    for (let i = 0; i < 16; i++) {
      const key = i.toString(16);
      const shardPath = path.join(this.baseDir, `${key}.json`);
      let shardData: AnnotationShard = {};

      if (await fs.pathExists(shardPath)) {
        try {
          shardData = await fs.readJson(shardPath);
        } catch (e) { log.error(`Load Annotation shard ${key} failed`, e); }
      }
      this.shards.set(key, shardData);
    }

    this.isInitialized = true;
    log.info(`AnnotationManager: All 16 shards loaded into memory.`);
  }

  /**
   * 获取元数据 (直接从内存取)
   */
  public getAnnotation(hash: string): Annotation | null {
    const key = this.getShardKey(hash);
    const shard = this.shards.get(key)!;
    return shard[hash] || null;
  }

  /**
   * (Create) 新增完整注解
   * 语义上用于首次创建记录，要求传入完整对象
   */
  public async addAnnotation(hash: string, annotation: Annotation): Promise<void> {
    const key = this.getShardKey(hash);
    const shard = this.shards.get(key)!;

    // 直接覆盖或赋值，确保初始数据的完整性
    shard[hash] = { ...annotation };

    // 保存分片
    const shardPath = path.join(this.baseDir, `${key}.json`);
    try {
      await fs.writeJson(shardPath, shard, { spaces: 0 }); // 生产环境建议 spaces: 0
    } catch (e) {
      log.error(`Failed to add Annotation for hash ${hash}`, e);
      throw e;
    }
  }

  /**
   * 更新元数据 (修改内存并立即持久化)
   */
  public async updateAnnotation(hash: string, updates: Partial<Annotation>): Promise<void> {
    const key = this.getShardKey(hash);
    const shard = this.shards.get(key)!;

    // 默认值
    const existing = shard[hash] || { ...DEFAULT_ANNOTATION };

    // 合并并回写内存
    shard[hash] = { ...existing, ...updates };

    // 立即保存该分片
    const shardPath = path.join(this.baseDir, `${key}.json`);
    try {
      await fs.writeJson(shardPath, shard, { spaces: 2 });
    } catch (e) {
      log.error(`Failed to save Annotation shard ${key}`, e);
    }
  }
}

export const annotationManager = new AnnotationManager();