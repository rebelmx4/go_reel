import { BaseShardedJsonManager } from './BaseShardedJsonManager';
import { Annotation } from '../../../shared';
import { fileProfileManager } from './FileProfileManager';


export class AnnotationManager extends BaseShardedJsonManager<Annotation> {
  constructor() {
    super('Annotation');
  }

  /**
   * 业务逻辑：获取注解（带默认值）
   */
 public async getAnnotation(filePath: string): Promise<Annotation | null> {
    const profile = await fileProfileManager.getProfile(filePath);
    if (!profile) return null;
    
    return this.getItem(profile.hash);
  }
  
  /**
   * 业务逻辑：更新注解
   */
  public async updateAnnotation(filePath: string, updates: Partial<Annotation>): Promise<void> {
    const profile = await fileProfileManager.getProfile(filePath);
    if (!profile) throw new Error(`File profile not found: ${filePath}`);

    const existing = this.getItem(profile.hash) ||  {
      like_count: 0,
      is_favorite: false,
      rotation: 0,
      screenshot_rotation: null,
      tags: []
    };
    const updated = { ...existing, ...updates };
    
    await this.setItem(profile.hash, updated as Annotation);
  }

  /**
   * 业务逻辑：批量更新注解（主要用于批量打标签）
   * 采用分片聚合写入策略，提高性能
   */
  public async updateAnnotationsBatch(
    filePaths: string[],
    updates: Partial<Annotation>
  ): Promise<void> {
    // 1. 批量获取所有文件的 Profile（从而获取 Hash）
    const tasks = filePaths.map(p => fileProfileManager.getProfile(p));
    const profiles = await Promise.all(tasks);

    // 2. 按分片归类待更新的任务
    // Map<shardKey, Array<{ hash, updates }>>
    const shardTasks = new Map<string, Array<{ hash: string; updates: Partial<Annotation> }>>();

    profiles.forEach((profile) => {
      if (!profile) return;
      const key = this.getShardKey(profile.hash);
      const list = shardTasks.get(key) || [];
      list.push({ hash: profile.hash, updates });
      shardTasks.set(key, list);
    });

    // 3. 循环每个受影响的分片，进行聚合写
    const defaultAnnotation: Annotation = {
      like_count: 0,
      is_favorite: false,
      rotation: 0,
      screenshot_rotation: null,
      tags: []
    };

    const savePromises = Array.from(shardTasks.entries()).map(async ([key, items]) => {
      const shard = this.shards.get(key) || {};

      items.forEach(({ hash, updates }) => {
        const existing = shard[hash] || { ...defaultAnnotation };
        
        // 特殊处理标签：追加模式
        let finalTags = existing.tags || [];
        if (updates.tags && Array.isArray(updates.tags)) {
          finalTags = Array.from(new Set([...finalTags, ...updates.tags]));
        }

        shard[hash] = {
          ...existing,
          ...updates,
          tags: finalTags // 覆盖为合并后的标签
        };
      });

      this.shards.set(key, shard);
      await this.saveShard(key);
    });

    await Promise.all(savePromises);
  }

}

export const annotationManager = new AnnotationManager();