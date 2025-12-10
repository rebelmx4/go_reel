/**
 * Screenshot IPC Handlers
 * Main process handlers for screenshot management.
 * This layer is responsible for IPC communication and delegates business logic to the ScreenshotManager.
 */

import { ipcMain } from 'electron';
import { ScreenshotManager } from '../data/assets/ScreenshotManager'; // 假设 manager 文件位于 managers 目录

// 创建一个单例的 ScreenshotManager
const screenshotManager = new ScreenshotManager();

/**
 * 注册所有与截图相关的 IPC handlers
 */
export function registerScreenshotHandlers() {

  // 保存一张手动截图
  ipcMain.handle('save-manual-screenshot', async (_, videoHash: string, videoPath: string, timestampInSeconds: number) => {
    return screenshotManager.createManualScreenshot(videoHash, videoPath, timestampInSeconds);
  });
  
  // 自动生成9张截图
  ipcMain.handle('generate-auto-screenshots', async (_, videoHash: string, videoPath: string) => {
    return screenshotManager.generateAutoScreenshots(videoHash, videoPath);
  });
  
  // 加载视频的所有截图
  ipcMain.handle('load-screenshots', async (_, videoHash: string) => {
    return screenshotManager.loadScreenshots(videoHash);
  });
  
  // 删除一张指定的截图
  ipcMain.handle('delete-screenshot', async (_, videoHash: string, filename: string) => {
    await screenshotManager.deleteScreenshot(videoHash, filename);
  });
  
  // 导出视频的所有截图
  ipcMain.handle('export-screenshots', async (_, videoHash: string, rotation: number, exportPath: string) => {
    await screenshotManager.exportScreenshots(videoHash, rotation, exportPath);
  });
}