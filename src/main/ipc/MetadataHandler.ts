/**
 * Video Metadata IPC Handler
 * Extracts video metadata including framerate using ffprobe
 */

import { ipcMain } from 'electron';
import log from 'electron-log';
import { ScreenshotGenerator } from '../utils/ScreenshotGenerator'; 

/**
 * Register video metadata IPC handler
 */
export function registerMetadataHandler() {
  ipcMain.handle('get-video-metadata', async (_, videoPath: string) => {
    try {
        const metadata = await ScreenshotGenerator.getVideoMetadata(videoPath);
        return metadata;
    } catch (error) {
        log.error('Failed to get video metadata via DLL:', error);
        // 返回兜底数据
        return {
            duration: 0,
            width: 0,
            height: 0,
            framerate: 30
        };
    }
  });
}