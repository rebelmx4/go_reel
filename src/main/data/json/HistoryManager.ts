import * as fs from 'fs'
import { BaseJsonManager } from './BaseJsonManager'
import { HistoryStore } from '../../../shared'

export class HistoryManager extends BaseJsonManager<HistoryStore> {
  constructor() {
    super('history.json', [])
  }

  /**
   * Add a path to history (at the beginning)
   * Limits to 100 items
   * @param filePath - Absolute path to video file
   */
  public addHistory(filePath: string): void {
    // Remove if already exists to avoid duplicates
    const filtered = this.data.filter((p) => p !== filePath)
    // Add to beginning and limit to 100
    const newItems = [filePath, ...filtered].slice(0, 100)
    this.data = newItems
    this.save()
  }

  /**
   * Get all history items
   * Validates existence of files. If a file is missing, it removes it from storage.
   * @returns Array of file paths (most recent first)
   */
  public getHistory(): string[] {
    const originalCount = this.data.length

    // 过滤掉不存在的文件
    // 注意：这里使用同步检查 (existsSync)，对于 max 100 个文件通常很快，不会造成明显阻塞
    const validPaths = this.data.filter((path) => {
      try {
        return fs.existsSync(path)
      } catch (error) {
        // 如果检查过程中出错（例如权限问题），保险起见视为不存在或保留
        // 这里选择返回 false (视为不存在并移除)，防止后续读取报错
        console.warn(`Error checking existence of ${path}:`, error)
        return false
      }
    })

    // 如果数量有变化，说明有文件被移除了，需要更新内存和磁盘
    if (validPaths.length !== originalCount) {
      console.log(
        `[HistoryManager] Cleaned up ${originalCount - validPaths.length} missing files from history.`
      )
      this.data = validPaths
      this.save()
    }

    return this.data
  }

  /**
   * Clear all history
   */
  public clearHistory(): void {
    this.data = []
    this.save()
  }

  /**
   * Remove a specific path from history
   * @param filePath - Path to remove
   */
  public removeFromHistory(filePath: string): void {
    this.data = this.data.filter((p) => p !== filePath)
    this.save()
  }

  /**
   * Check if a path is in history
   * @param filePath - Path to check
   * @returns True if path is in history
   */
  public isInHistory(filePath: string): boolean {
    return this.data.includes(filePath)
  }
}

export const historyManager = new HistoryManager()
