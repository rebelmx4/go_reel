import { ipcMain } from 'electron';
import { fileProfileManager } from '../data/json/FileProfileManager';

export function registerFileProfileHandlers() {
  /**
   * 给路径，获取档案（含 Hash）
   * 内部会自动校验 mtime/size
   */
  ipcMain.handle('get-file-profile', async (_, filePath: string) => {
    return await fileProfileManager.getProfile(filePath);
  });
}