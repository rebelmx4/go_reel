import fs from 'fs-extra'
import path from 'path'
import { app } from 'electron'
import log from 'electron-log'

/**
 * 分片 JSON 管理器基类
 * T: 单条数据的类型
 */
export abstract class BaseShardedJsonManager<T> {
  protected baseDir: string
  // 内存缓存：ShardKey (0-f) -> { ID/Hash -> Data }
  protected shards = new Map<string, Record<string, T>>()
  protected isInitialized = false

  /**
   * @param subDir data 目录下的子目录名称 (如 'video_metadata')
   */
  constructor(subDir: string) {
    this.baseDir = path.join(app.getAppPath(), 'data/data', subDir)
    this.ensureDir()
  }

  private ensureDir() {
    try {
      fs.ensureDirSync(this.baseDir)
    } catch (e) {
      log.error(`[BaseShardedJsonManager] Failed to create dir: ${this.baseDir}`, e)
    }
  }

  /**
   * 初始化：加载磁盘上的 16 个分片到内存
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return

    const loadTasks = Array.from({ length: 16 }, async (_, i) => {
      const key = i.toString(16)
      const shardPath = path.join(this.baseDir, `${key}.json`)
      let shardData: Record<string, T> = {}

      if (await fs.pathExists(shardPath)) {
        try {
          shardData = await fs.readJson(shardPath)
        } catch (e) {
          log.error(`[BaseShardedJsonManager] Failed to load shard ${key}:`, e)
        }
      }
      this.shards.set(key, shardData)
    })

    await Promise.all(loadTasks)
    this.isInitialized = true
    log.info(`[${this.constructor.name}] Initialized with 16 shards.`)
  }

  /**
   * 计算分片 Key (默认取 ID 的首位)
   * 子类可以根据需要重写此逻辑（例如 FileProfile 需要路径的 MD5）
   */
  protected getShardKey(id: string): string {
    if (!id) return '0'
    return id.substring(0, 1).toLowerCase()
  }

  /**
   * 获取单条数据
   */
  protected getItem(id: string): T | null {
    const key = this.getShardKey(id)
    const shard = this.shards.get(key)
    return shard ? shard[id] || null : null
  }

  /**
   * 获取分片内所有数据 (用于搜索或统计)
   */
  protected getAllInShard(shardKey: string): Record<string, T> {
    return this.shards.get(shardKey) || {}
  }

  /**
   * 设置/覆盖单条数据并持久化
   */
  protected async setItem(id: string, value: T): Promise<void> {
    const key = this.getShardKey(id)
    const shard = this.shards.get(key) || {}

    shard[id] = value
    this.shards.set(key, shard)

    await this.saveShard(key)
  }

  /**
   * 部分更新单条数据并持久化
   */
  protected async updateItem(id: string, updates: Partial<T>, defaultValue?: T): Promise<void> {
    const key = this.getShardKey(id)
    const shard = this.shards.get(key) || {}

    const existing = shard[id] || defaultValue
    if (!existing) {
      throw new Error(`Item with id ${id} not found and no default value provided.`)
    }

    shard[id] = { ...existing, ...updates }
    this.shards.set(key, shard)

    await this.saveShard(key)
  }

  /**
   * 删除单条数据
   */
  protected async deleteItem(id: string): Promise<void> {
    const key = this.getShardKey(id)
    const shard = this.shards.get(key)

    if (shard && shard[id]) {
      delete shard[id]
      await this.saveShard(key)
    }
  }

  /**
   * 持久化分片到磁盘
   */
  protected async saveShard(key: string): Promise<void> {
    const shardData = this.shards.get(key)
    if (!shardData) return

    try {
      const shardPath = path.join(this.baseDir, `${key}.json`)
      // 生产环境建议 spaces: 0 减小体积
      await fs.writeJson(shardPath, shardData, { spaces: 0 })
    } catch (e) {
      log.error(`[BaseShardedJsonManager] Failed to save shard ${key}:`, e)
    }
  }

  /**
   * 清空所有数据 (慎用)
   */
  public async clearAll(): Promise<void> {
    this.shards.clear()
    const tasks = Array.from({ length: 16 }, (_, i) => this.saveShard(i.toString(16)))
    await Promise.all(tasks)
  }
}
