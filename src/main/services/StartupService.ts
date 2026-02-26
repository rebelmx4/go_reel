import log from 'electron-log'
import {
  preferenceManager,
  storageManager,
  annotationManager,
  fileProfileManager,
  historyManager,
  videoMetadataManager,
  tagManager
} from '../data'
import { scanVideoFiles } from '../utils'
import { StartupResult, VideoFile } from '../../shared'
import { ipcMain } from 'electron'

export class StartupService {
  private lastResult: StartupResult | null = null

  /**
   * 执行核心启动逻辑：物理扫描 + 档案库映射
   */
  async startup(): Promise<StartupResult> {
    // 统一初始化所有管理器
    await Promise.all([
      storageManager.load(),
      preferenceManager.load(),
      fileProfileManager.init(),
      annotationManager.init(),
      historyManager.load(),
      videoMetadataManager.init(),
      tagManager.load()
    ])

    log.info('=== Startup: Direct Physical Mapping ===')

    // 1. 获取基础配置
    const videoSource = storageManager.getVideoSourcePath()
    const blacklist = [
      storageManager.getStagedPath(),
      storageManager.getScreenshotExportPath()
    ].filter(Boolean)

    // 2. 物理扫描 (快速获取当前磁盘上的文件列表)
    const scannedFiles = await scanVideoFiles(videoSource, blacklist)

    // 3. 并行处理：获取档案并挂载元数据
    // 使用 Promise.all 处理 map 中的异步 getProfile 调用
    const videoList: VideoFile[] = await Promise.all(
      scannedFiles.map(async (file) => {
        const video: VideoFile = {
          path: file.path,
          createdAt: file.createdAt,
          mtime: file.mtime,
          size: file.size
        }

        const annotation = await annotationManager.getAnnotation(file.path)
        if (annotation) {
          video.annotation = annotation
        }

        return video
      })
    )

    log.info(`Startup successful. Total: ${videoList.length}`)

    const result: StartupResult = {
      videoList,
      history: historyManager.getHistory(),
      preferenceStettings: preferenceManager.get(),
      tagLibrary: tagManager.getLibrary()
    }

    this.lastResult = result

    return result
  }

  /**
   * 允许其他模块获取最近一次的启动/刷新结果
   */
  public getLastResult(): StartupResult | null {
    return this.lastResult
  }
}

export function registerStartupServiceHandlers() {
  ipcMain.handle('get-startup-result', async () => {
    return startupService.getLastResult()
  })
}

export const startupService = new StartupService()
