/**
 * Cover IPC Handlers
 * Main process handlers for cover management
 */

import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const COVERS_DIR = path.join(DATA_DIR, 'covers');

/**
 * Convert data URL to buffer
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Register cover IPC handlers
 */
export function registerCoverHandlers() {
  // Get cover (three-tier logic)
  ipcMain.handle('get-cover', async (_, videoHash: string): Promise<string> => {
    await fs.mkdir(COVERS_DIR, { recursive: true });
    
    // 1. Check manual cover
    const manualCover = path.join(COVERS_DIR, `${videoHash}.webp`);
    if (await fileExists(manualCover)) {
      return manualCover;
    }
    
    // 2. Check default cover
    const defaultCover = path.join(COVERS_DIR, `${videoHash}_d.webp`);
    if (await fileExists(defaultCover)) {
      return defaultCover;
    }
    
    // 3. Generate default cover
    // Note: This should be done in renderer process and sent back
    // For now, return empty path to trigger renderer-side generation
    return '';
  });
  
  // Set manual cover
  ipcMain.handle('set-manual-cover', async (_, screenshotPath: string, videoHash: string) => {
    await fs.mkdir(COVERS_DIR, { recursive: true });
    
    const targetPath = path.join(COVERS_DIR, `${videoHash}.webp`);
    await fs.copyFile(screenshotPath, targetPath);
  });
  
  // Save cover from data URL
  ipcMain.handle('save-cover', async (_, videoHash: string, dataUrl: string, isDefault: boolean) => {
    await fs.mkdir(COVERS_DIR, { recursive: true });
    
    const suffix = isDefault ? '_d' : '';
    const filename = `${videoHash}${suffix}.webp`;
    const filePath = path.join(COVERS_DIR, filename);
    
    const buffer = dataUrlToBuffer(dataUrl);
    await fs.writeFile(filePath, buffer);
    
    return filePath;
  });
  
  // Check if screenshot is cover
  ipcMain.handle('is-screenshot-cover', async (_, screenshotFilename: string, videoHash: string): Promise<boolean> => {
    const manualCover = path.join(COVERS_DIR, `${videoHash}.webp`);
    
    if (!(await fileExists(manualCover))) {
      return false;
    }
    
    // Compare file contents or metadata
    // For simplicity, we can track this in files.json
    // For now, return false
    return false;
  });
}
