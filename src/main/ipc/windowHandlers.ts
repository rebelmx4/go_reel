/**
 * Window Control IPC Handlers
 * Handles window resizing and screen size queries
 */

import { ipcMain, screen, BrowserWindow } from 'electron';

/**
 * Register window control IPC handlers
 */
export function registerWindowHandlers(mainWindow: BrowserWindow) {
  // Window minimize
  ipcMain.handle('window-minimize', () => {
    mainWindow.minimize();
  });

  // Window maximize/restore
  ipcMain.handle('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  });

  // Window close
  ipcMain.handle('window-close', () => {
    mainWindow.close();
  });

  // Window resize
  ipcMain.handle('window-resize', (_, width: number, height: number) => {
    const bounds = mainWindow.getBounds();
    
    // Center the window on screen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    const x = Math.floor((screenWidth - width) / 2);
    const y = Math.floor((screenHeight - height) / 2);
    
    mainWindow.setBounds({
      x,
      y,
      width: Math.floor(width),
      height: Math.floor(height)
    });
  });

  // Get screen size
  ipcMain.handle('get-screen-size', () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    return { width, height };
  });
}
