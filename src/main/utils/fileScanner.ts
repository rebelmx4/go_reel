import * as fs from 'fs/promises'
import path from 'path'
import { isVideoFile } from './videoUtils'
import log from 'electron-log'

/**
 * 物理文件扫描结果
 * 包含用于与 FileProfileManager 撮合的关键固有属性
 */
export interface ScanResult {
  path: string // 绝对路径
  createdAt: number // 创建时间 (birthtimeMs)
  mtime: number // 最后修改时间 (mtimeMs) - 用于校验缓存是否失效
  size: number // 文件大小 (bytes) - 用于校验缓存是否失效
}

/**
 * 扫描配置
 */
const MAX_CONCURRENCY = 200 // 最大并发操作数

/**
 * 扫描目录下的视频文件
 * @param rootDir 根目录
 * @param blacklist 排除列表 (绝对路径)
 */
export async function scanVideoFiles(
  rootDir: string,
  blacklist: string[] = []
): Promise<ScanResult[]> {
  const results: ScanResult[] = []
  const queue: (() => Promise<void>)[] = []
  let activePromises = 0

  const normalizedBlacklist = blacklist.map((p) => path.normalize(p).toLowerCase())

  let resolveFinish: () => void
  let rejectFinish: (error: Error) => void
  const finishPromise = new Promise<void>((res, rej) => {
    resolveFinish = res
    rejectFinish = rej
  })

  const processQueue = async (): Promise<void> => {
    while (queue.length > 0 && activePromises < MAX_CONCURRENCY) {
      activePromises++
      const task = queue.shift()
      if (task) {
        task()
          .finally(() => {
            activePromises--
            processQueue()
            if (activePromises === 0 && queue.length === 0) {
              resolveFinish()
            }
          })
          .catch((error) => {
            log.error('Error in scan task:', error)
            rejectFinish(error)
          })
      }
    }
  }

  const isBlacklisted = (dirPath: string): boolean => {
    const normalizedPath = path.normalize(dirPath).toLowerCase()
    return normalizedBlacklist.some((blacklistedPath) => normalizedPath.startsWith(blacklistedPath))
  }

  const processDirectory = async (currentPath: string): Promise<void> => {
    try {
      if (isBlacklisted(currentPath)) return

      const items = await fs.readdir(currentPath, { withFileTypes: true })

      for (const item of items) {
        const fullPath = path.join(currentPath, item.name)

        if (item.isDirectory()) {
          queue.push(() => processDirectory(fullPath))
        } else if (item.isFile() && isVideoFile(item.name)) {
          try {
            // 获取文件的详细统计信息
            const stats = await fs.stat(fullPath)
            results.push({
              path: fullPath,
              createdAt: stats.birthtimeMs,
              mtime: stats.mtimeMs, // 关键属性：修改时间
              size: stats.size // 关键属性：文件大小
            })
          } catch (error) {
            log.warn(`Failed to stat file: ${fullPath}`, error)
          }
        }
      }
    } catch (error) {
      log.warn(`Failed to read directory: ${currentPath}`, error)
    }
  }

  // 开始递归
  queue.push(() => processDirectory(rootDir))
  processQueue()

  await finishPromise
  return results
}

/**
 * 排序辅助函数：获取最新视频
 */
export function getNewestVideos(scanResults: ScanResult[], limit: number = 100): ScanResult[] {
  return [...scanResults].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
}
