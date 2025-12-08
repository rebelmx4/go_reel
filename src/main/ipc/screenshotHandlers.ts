/**
 * Screenshot IPC Handlers
 * Main process handlers for screenshot management
 */

import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

interface Screenshot {
  filename: string;
  timestamp: number;
  path: string;
  type: 'manual' | 'auto';
}

/**
 * Get screenshot directory for a video hash
 */
function getScreenshotDir(videoHash: string): string {
  const prefix = videoHash.slice(0, 2);
  return path.join(DATA_DIR, 'screenshots', prefix, videoHash);
}

/**
 * Convert data URL to buffer
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * Register screenshot IPC handlers
 */
export function registerScreenshotHandlers() {
  // Save screenshots
  ipcMain.handle('save-screenshots', async (_, videoHash: string, screenshots: Array<{ timestamp: number; dataUrl: string }>, type: 'manual' | 'auto') => {
    const dir = getScreenshotDir(videoHash);
    await fs.mkdir(dir, { recursive: true });
    
    const suffix = type === 'manual' ? 'm' : 'a';
    
    for (const screenshot of screenshots) {
      const filename = `${screenshot.timestamp}_${suffix}.webp`;
      const filePath = path.join(dir, filename);
      const buffer = dataUrlToBuffer(screenshot.dataUrl);
      await fs.writeFile(filePath, buffer);
    }
  });
  
  // Load screenshots
  ipcMain.handle('load-screenshots', async (_, videoHash: string): Promise<Screenshot[]> => {
    const dir = getScreenshotDir(videoHash);
    
    try {
      const files = await fs.readdir(dir);
      const screenshots: Screenshot[] = [];
      
      for (const file of files) {
        const match = file.match(/^(\d+)_(m|a)\.webp$/);
        if (match) {
          const absolutePath = path.join(dir, file);
          screenshots.push({
            filename: file,
            timestamp: parseInt(match[1], 10),
            path: `file://${absolutePath}`, // Include file:// protocol
            type: match[2] === 'm' ? 'manual' : 'auto'
          });
        }
      }
      
      // Sort by timestamp
      screenshots.sort((a, b) => a.timestamp - b.timestamp);
      
      return screenshots;
    } catch (error) {
      // Directory doesn't exist yet
      return [];
    }
  });
  
  // Delete screenshot
  ipcMain.handle('delete-screenshot', async (_, videoHash: string, filename: string) => {
    const dir = getScreenshotDir(videoHash);
    const filePath = path.join(dir, filename);
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete screenshot:', error);
    }
  });
  
  // Export screenshots with rotation
  ipcMain.handle('export-screenshots', async (_, videoHash: string, rotation: number, exportPath: string) => {
    const sourceDir = getScreenshotDir(videoHash);
    const targetDir = path.join(exportPath, videoHash);
    
    await fs.mkdir(targetDir, { recursive: true });
    
    const screenshots = await fs.readdir(sourceDir);
    
    for (const file of screenshots) {
      if (file.endsWith('.webp')) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        // TODO: Apply rotation if needed
        // For now, just copy
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  });
}
