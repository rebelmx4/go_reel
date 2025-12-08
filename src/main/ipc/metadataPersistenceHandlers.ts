/**
 * Video Metadata Persistence Handlers
 * Handles saving and loading per-video metadata (rotation, etc.)
 */

import { ipcMain } from 'electron';
import { calculateFastHash } from '../utils/hash';
import { MetadataManager } from '../data/json/MetadataManager';

/**
 * Register metadata persistence handlers
 */
export function registerMetadataPersistenceHandlers(metadataManager: MetadataManager) {
  // Save video rotation
  ipcMain.handle('save-video-rotation', async (_, videoPath: string, rotation: number) => {
    // We need the hash to look up/store metadata
    const hash = await calculateFastHash(videoPath);
    const existing = metadataManager.getFile(hash);

    if (existing) {
      metadataManager.updateFile(hash, { rotation: rotation as any });
    } else {
      metadataManager.addFile(hash, {
        paths: [videoPath], 
        like_count: 0,
        is_favorite: false,
        rotation: rotation as any,
        screenshot_rotation: null,
        tags: []
      });
    }
  });

  // Load video rotation
  ipcMain.handle('load-video-rotation', async (_, videoPath: string) => {
    // We look up by hash to be consistent
    const hash = await calculateFastHash(videoPath);
    const video = metadataManager.getFile(hash);
    return video?.rotation || 0; // Default 0 degrees
  });
}
