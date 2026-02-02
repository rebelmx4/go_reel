import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import log from 'electron-log';
import { startupService, registerFileSytemHandlers,  registerStartupServiceHandlers, registerVideoExportHandlers, registerVideoTranscodeHandlers,
  registerTranscodeHandlers,
  registerStroyBoardServiceHandlers
 } from './services';
import {
  registerWindowHandlers,
  registerMetadataHandler,
  registerScreenshotHandlers,
  registerCoverHandlers,
  registerSettingsHandlers,
  registerAnnotationHandlers,
  registerTagHandlers,
  registerHistoryHandlers,
  
} from './ipc';

import { setupFfmpeg } from './utils';

setupFfmpeg()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false,
    frame: false, 
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
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  log.info('startupService start...');
  await startupService.startup();

  setupIpcHandlers();

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


function setupIpcHandlers() {
  registerMetadataHandler();
  registerScreenshotHandlers();
  registerCoverHandlers();
  registerSettingsHandlers();
  registerAnnotationHandlers();
  registerTagHandlers();
  registerHistoryHandlers();
  registerFileSytemHandlers();
  registerStartupServiceHandlers();
  registerVideoExportHandlers();
  registerVideoTranscodeHandlers();
  registerTranscodeHandlers();
  registerStroyBoardServiceHandlers();
  

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  });
}
