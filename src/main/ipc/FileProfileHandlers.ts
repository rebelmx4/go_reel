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

  /**
   * 给 Hash，找回所有有效的物理文件档案
   */
  ipcMain.handle('get-profiles-by-hash', async (_, hash: string) => {
    return await fileProfileManager.getValidProfilesByHash(hash);
  });
}