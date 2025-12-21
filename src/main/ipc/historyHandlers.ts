/**
 * History IPC Handlers
 * 主进程中的历史记录管理句柄。
 * 负责处理前端对最近播放记录的增删改查请求。
 */

import { ipcMain } from 'electron';
// 请根据实际文件位置调整 import 路径
import { historyManager } from '../data/json/HistoryManager'; 

/**
 * 注册所有与播放历史相关的 IPC handlers
 */
export function registerHistoryHandlers() {
  
  /**
   * 添加一条播放记录
   * @param filePath - 视频文件的绝对路径
   */
  ipcMain.handle('add-history', async (_, filePath: string): Promise<void> => {
    historyManager.addHistory(filePath);
  });

  /**
   * 获取最近播放列表
   * 内部会自动过滤掉磁盘上已不存在的文件
   * @returns 视频路径字符串数组
   */
  ipcMain.handle('get-history', async (): Promise<string[]> => {
    return historyManager.getHistory();
  });

  /**
   * 清空所有历史记录
   */
  ipcMain.handle('clear-history', async (): Promise<void> => {
    historyManager.clearHistory();
  });

  /**
   * 移除单条历史记录
   * @param filePath - 要移除的视频路径
   */
  ipcMain.handle('remove-from-history', async (_, filePath: string): Promise<void> => {
    historyManager.removeFromHistory(filePath);
  });
}