import { BrowserWindow } from 'electron'
import { videoTranscodeService } from './VideoTranscodeService'
import path from 'path'
import { ipcMain } from 'electron'

export interface TranscodeTask {
  path: string
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
}

export interface TranscodeTask {
  path: string
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
}

class TranscodeQueueManager {
  private queue: TranscodeTask[] = []
  private isProcessing = false

  /**
   * 添加任务到队列
   */
  public addTask(filePath: string) {
    // 避免重复添加正在处理的任务
    const exists = this.queue.some(
      (t) => t.path === filePath && (t.status === 'pending' || t.status === 'processing')
    )
    if (exists) return

    this.queue.push({
      path: filePath,
      fileName: path.basename(filePath),
      status: 'pending',
      progress: 0
    })

    this.notifyUpdate()
    this.processNext()
  }

  /**
   * 单线程循环调度
   */
  private async processNext() {
    if (this.isProcessing) return

    const task = this.queue.find((t) => t.status === 'pending')
    if (!task) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    task.status = 'processing'
    this.notifyUpdate()

    try {
      const result = await videoTranscodeService.transcodeAndReplace(task.path, (p) => {
        task.progress = p
        this.notifyUpdate() // 进度更新时推送
      })

      if (result.success) {
        task.status = 'completed'
        task.progress = 100
      } else {
        throw new Error(result.error)
      }
    } catch (err: any) {
      task.status = 'failed'
      task.error = err.message || '未知错误'
    } finally {
      this.isProcessing = false
      this.notifyUpdate()
      this.processNext() // 处理下一个
    }
  }

  /**
   * 向前端推送最新的任务列表
   */
  private notifyUpdate() {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      // 发送给所有窗口（通常只有一个主窗口）
      windows[0].webContents.send('transcode:state-update', this.queue)
    }
  }

  public clearQueue() {
    // 只保留正在进行的，清除已完成和失败的
    this.queue = this.queue.filter((t) => t.status === 'processing' || t.status === 'pending')
    this.notifyUpdate()
  }

  public getFullQueue() {
    return this.queue
  }
}

export const transcodeQueueManager = new TranscodeQueueManager()

export function registerTranscodeHandlers() {
  /**
   * 前端添加转码任务
   */
  ipcMain.on('transcode:add', (_event, filePath: string) => {
    transcodeQueueManager.addTask(filePath)
  })

  /**
   * 清理队列（已完成/失败）
   */
  ipcMain.on('transcode:clear', () => {
    transcodeQueueManager.clearQueue()
  })

  /**
   * 获取当前队列快照（用于初始化）
   */
  ipcMain.handle('transcode:get-queue', () => {
    return transcodeQueueManager.getFullQueue()
  })
}
