import { ipcMain } from 'electron'
import { printMemoryUsage } from '../utils/memoryUtils'

export function registerDebugHandlers() {
  /**
   * 监听渲染进程发出的打印内存请求
   */
  ipcMain.on('print-memory-usage', () => {
    try {
      printMemoryUsage()
    } catch (error) {
      console.error('[IPC:print-memory-usage] Failed:', error)
    }
  })

  // 如果以后需要增加其他调试功能（如强制 GC），也可以写在这里
}
