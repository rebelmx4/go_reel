/**
 * Cover IPC Handlers
 * 主进程中的封面管理句柄。
 * 这一层负责 IPC 通信，并将业务逻辑委托给 CoverManager。
 */

import { ipcMain } from 'electron';
// 假设 coverManager 实例已在别处创建并导出
import { coverManager } from '../data/assets/CoverManager'; 
import { withHash } from '../utils/handlerHelper';


/**
 * 注册所有与视频封面相关的 IPC handlers
 */
export function registerCoverHandlers() {
  
  /**
   * 获取视频封面（三级逻辑）
   * 1. 优先返回用户设置的手动封面。
   * 2. 如果没有手动封面，返回自动生成的默认封面。
   * 3. 如果默认封面也不存在，则立即生成默认封面（例如，在视频20%位置截图），保存并返回其路径。
   */
  ipcMain.handle('get-cover', async (_, filePath: string): Promise<string> => {
    // 核心逻辑已移入 coverManager.getCover
    // 它会自动处理“手动 -> 默认 -> 生成并返回”的完整逻辑
     return withHash(filePath, (hash) => coverManager.getCover(hash, filePath));
  });
  
  /**
   * 将一个指定的截图文件设置为手动封面
   * @param screenshotPath - 源截图文件的完整路径
   * @param videoHash - 视频的哈希值
   */
  ipcMain.handle('set-manual-cover', async (_, filePath: string, screenshotPath: string): Promise<boolean> => {
    // 核心逻辑同样移入 coverManager
    withHash(filePath, (hash) => coverManager.setManualCoverFromPath(hash, screenshotPath));
  });
}