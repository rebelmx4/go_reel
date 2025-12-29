/**
 * Screenshot IPC Handlers
 * Main process handlers for screenshot management.
 * This layer is responsible for IPC communication and delegates business logic to the ScreenshotManager.
 */

import { ipcMain } from 'electron';
import { screenshotManager } from '../data/assets/ScreenshotManager'; 
import { withHash } from '../utils/handlerHelper';

/**
 * 注册所有与截图相关的 IPC handlers
 */
export function registerScreenshotHandlers() {

  // 保存一张手动截图
  ipcMain.handle('save-manual-screenshot-by-path', async (_, filePath: string, timestamp: number) => {
    return withHash(filePath, (hash) => screenshotManager.createManualScreenshot(hash, filePath, timestamp));
  });

  // 加载视频的所有截图
  ipcMain.handle('load-screenshots-by-path', async (_, filePath: string) => {
    return withHash(filePath, (hash) => screenshotManager.loadScreenshots(hash, filePath));
  });
  
  // 删除一张指定的截图
  ipcMain.handle('delete-screenshot', async (_, filePath: string, filename: string) => {
    withHash(filePath, (hash) => screenshotManager.deleteScreenshot(hash, filename));
  });
  
  // 导出视频的所有截图
  ipcMain.handle('export-screenshots', async (_, filePath: string, rotation: number) => {
    withHash(filePath, (hash) => screenshotManager.exportScreenshots(hash, rotation));
  });
}