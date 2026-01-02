import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import log from 'electron-log';
import { startupService, RefreshService, VideoExportService } from './services';
import { settingsManager, annotationManager } from './data';
import {
  registerWindowHandlers,
  registerMetadataHandler,
  registerScreenshotHandlers,
  registerCoverHandlers,
  registerSettingsHandlers,
  registerAnnotationHandlers,
  registerTagHandlers,
  registerTagCoverHandlers,
  registerFileHandlers
} from './ipc';


import { registerHistoryHandlers } from './ipc/historyHandlers';
import { calculateFastHash } from './utils/hash'

let refreshService: RefreshService | null = null;
let videoExportService: VideoExportService | null = null;



log.info('Initializing startup service...');

// Create refresh service
refreshService = new RefreshService(
  settingsManager,
  annotationManager
);

// Create video export service
videoExportService = new VideoExportService(
  settingsManager,
  annotationManager
  );

log.info('Startup service initialized');


function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false,
    frame: false, // Frameless window
    titleBarStyle: 'hidden',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false 
    },
  });

  registerWindowHandlers(mainWindow);

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.openDevTools();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  await startupService.startup();

  // IPC handlers
  setupIpcHandlers();

  createWindow();

   ipcMain.handle('calculate-video-hash', async (_, filePath: string) => {
    try {
      const hash = await calculateFastHash(filePath)
      return hash
    } catch (error) {
      console.error(`[IPC:calculate-video-hash] Failed for path: ${filePath}`, error)
      return null // 在出错时返回 null
    }
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


/**
 * Setup IPC handlers
 */
function setupIpcHandlers() {
  // Register all IPC handler modules
  registerMetadataHandler();
  registerScreenshotHandlers();
  registerCoverHandlers();
  registerSettingsHandlers();
  registerAnnotationHandlers();
  registerTagHandlers();
  registerTagCoverHandlers();
  registerHistoryHandlers();
  registerFileHandlers();
  
  // Get startup result
  ipcMain.handle('get-startup-result', async () => {
    return startupService.getLastResult();
  });


  // Select directory
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  });

  // Refresh files
  ipcMain.handle('refresh-files', async () => {
    try {
      if (!refreshService) {
        throw new Error('Refresh service not initialized');
      }
      
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        refreshService.setMainWindow(mainWindow);
      }
      const result = await refreshService.refresh();
      return result;
    } catch (error) {
      console.error('Failed to refresh files:', error);
      return { success: false, totalFiles: 0, newFiles: 0, movedFiles: 0, deletedFiles: 0, duplicateFiles: 0, error: String(error) };
    }
  });

  // Export video
  ipcMain.handle('export-video', async (_event, videoPath: string, clips: any[]) => {
    try {
      if (!videoExportService) {
        throw new Error('Video export service not initialized');
      }
      
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        videoExportService.setMainWindow(mainWindow);
      }
      
      const result = await videoExportService.exportVideo(videoPath, clips);
      return result;
    } catch (error) {
      console.error('Failed to export video:', error);
      return { success: false, error: String(error) };
    }
  });

  // Note: Window controls are now handled by windowHandlers module
}
