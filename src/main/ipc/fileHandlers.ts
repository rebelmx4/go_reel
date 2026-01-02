/**
 * File IPC Handlers
 * Main process handlers for file staging operations.
 * Delegates business logic to the FileManager.
 */

import { ipcMain } from 'electron';
import { fileManager } from '../data/assets/FileManager';
import log from 'electron-log';

export function registerFileHandlers() {
  // 移动文件到 staged_path/待删除
  ipcMain.handle('move-file-to-trash', async (_, filePath: string) => {
    try {
      const finalPath = await fileManager.moveToTrash(filePath);
      return { success: true, finalPath };
    } catch (err: any) {
      log.error('[IPC] move-file-to-trash failed:', err);
      return { success: false, error: err.message };
    }
  });

  // 移动文件到 staged_path/已编辑
  ipcMain.handle('move-file-to-edited', async (_, filePath: string) => {
    try {
      const finalPath = await fileManager.moveToEdited(filePath);
      return { success: true, finalPath };
    } catch (err: any) {
      log.error('[IPC] move-file-to-edited failed:', err);
      return { success: false, error: err.message };
    }
  });

  // 移动文件到 staged_path/已转码
  ipcMain.handle('move-file-to-transcoded', async (_, filePath: string) => {
    try {
      const finalPath = await fileManager.moveToTranscoded(filePath);
      return { success: true, finalPath };
    } catch (err: any) {
      log.error('[IPC] move-file-to-transcoded failed:', err);
      return { success: false, error: err.message };
    }
  });
}