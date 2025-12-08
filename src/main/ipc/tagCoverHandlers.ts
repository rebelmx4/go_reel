import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { app } from 'electron';

/**
 * Save tag cover image
 */
async function saveTagCover(tagId: number, dataUrl: string): Promise<string> {
  const userDataPath = app.getPath('userData');
  const tagImagesDir = path.join(userDataPath, 'data', 'tag_images');

  // Ensure directory exists
  await fs.mkdir(tagImagesDir, { recursive: true });

  // Convert data URL to buffer
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Save as webp
  const filename = `${tagId}.webp`;
  const filepath = path.join(tagImagesDir, filename);
  await fs.writeFile(filepath, buffer);

  return filepath;
}

/**
 * Register tag cover IPC handlers
 */
export function registerTagCoverHandlers() {
  ipcMain.handle('save-tag-cover', async (_, tagId: number, dataUrl: string) => {
    return await saveTagCover(tagId, dataUrl);
  });
}
