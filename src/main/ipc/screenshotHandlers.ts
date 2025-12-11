/**
 * Screenshot IPC Handlers
 * Main process handlers for screenshot management.
 * This layer is responsible for IPC communication and delegates business logic to the ScreenshotManager.
 */

import { ipcMain } from 'electron';
import { screenshotManager } from '../data/assets/ScreenshotManager'; 
import { metadataManager } from '../data/json/AnnotationManager';



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
  ipcMain.handle('export-screenshots', async (_, videoHash: string, rotation: number) => {
    await screenshotManager.exportScreenshots(videoHash, rotation);
  });


  ipcMain.handle('get-screenshot-export-metadata', async (_, videoHash: string) => {
    const metadata = metadataManager.getAnnotation(videoHash);
    // 如果 metadata 存在，则返回其 screenshot_rotation，否则返回 null
    return metadata?.screenshot_rotation ?? null;
  });
  
  // 【新增】保存视频的截图导出旋转角度
  ipcMain.handle('save-screenshot-export-metadata', async (_, videoHash: string, rotation: number) => {
    // updateFile 会自动处理保存逻辑
    await metadataManager.updateFile(videoHash,  {screenshot_rotation: rotation });
  });
}