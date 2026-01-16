import { ipcMain } from 'electron';
import { screenshotManager } from '../data/assets/ScreenshotManager'; 
import { safeInvoke } from '../utils/handlerHelper';

export function registerScreenshotHandlers() {

  ipcMain.handle('save-manual-screenshot', async (_, filePath: string, timestamp: number) => {
    return safeInvoke(
      () => screenshotManager.createManualScreenshot(filePath, timestamp),
      false 
    );
  });

  ipcMain.handle('load-screenshots', async (_, filePath: string) => {
    return safeInvoke(
      () => screenshotManager.loadScreenshots(filePath),
      [] // 失败返回空数组
    );
  });
  
  ipcMain.handle('delete-screenshot', async (_, filePath: string, filename: string) => {
    return safeInvoke(
      () => screenshotManager.deleteScreenshot(filePath, filename),
      undefined
    );
  });
  
  ipcMain.handle('export-screenshots', async (_, filePath: string, rotation: number) => {
    return safeInvoke(
      () => screenshotManager.exportScreenshots(filePath, rotation),
      undefined
    );
  });
}