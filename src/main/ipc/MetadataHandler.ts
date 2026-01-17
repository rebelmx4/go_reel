/**
 * Video Metadata IPC Handler
 * Extracts video metadata including framerate using ffprobe
 */

import { ipcMain } from 'electron';
import log from 'electron-log';
import { videoMetadataManager } from '../data/json/VideoMetadataManager';

/**
 * Register video metadata IPC handler
 */
export function registerMetadataHandler() {

    ipcMain.handle('get-video-metadata', async (_event, filePath: string) => {
    try {
      // 直接调用带缓存的管理类
      const metadata = await videoMetadataManager.getVideoMetadata(filePath);
      return metadata;
    } catch (error) {
       log.error('Failed to get video metadata via DLL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
}