import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import log from 'electron-log';
import { StartupService, RefreshService, VideoExportService } from './services';
import { SettingsManager, MetadataManager, HistoryManager } from './data';
import { registerWindowHandlers } from './ipc/windowHandlers';
import { registerVideoMetadataHandler } from './ipc/videoMetadataHandler';
import { registerScreenshotHandlers } from './ipc/screenshotHandlers';
import { registerCoverHandlers } from './ipc/coverHandlers';
import { registerSettingsHandlers } from './ipc/settingsHandlers';
import { registerMetadataPersistenceHandlers } from './ipc/metadataPersistenceHandlers';
import { registerTagHandlers } from './ipc/tagHandlers';
import { registerTagCoverHandlers } from './ipc/tagCoverHandlers';

// Global startup result
let startupResult: any = null;
let refreshService: RefreshService | null = null;
let videoExportService: VideoExportService | null = null;

// Register privileged scheme
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);



log.info('Initializing startup service...');

const settingsManager = new SettingsManager();
const metadataManager = new MetadataManager();
const historyManager = new HistoryManager();

// Create startup service
const startupService = new StartupService(
  settingsManager,
  metadataManager,
  historyManager
);

// Create refresh service
refreshService = new RefreshService(
  settingsManager,
  metadataManager
);

// Create video export service
videoExportService = new VideoExportService(
  settingsManager,
  metadataManager
  );

log.info('Startup service initialized');


function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
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

  startupResult = await startupService.firstStartup();

  // IPC handlers
  setupIpcHandlers();

  // protocol.registerFileProtocol('media', (request, callback) => {
  //   // 1. 获取原始 URL 并移除 scheme
  //   let url = request.url.replace(/^media:\/\//, '');
    
  //   // 2. 解码 URI 组件 (处理空格、中文等)
  //   url = decodeURIComponent(url);
    
  //   // 3. 处理路径分隔符
  //   let path = url.replace(/\\/g, '/');
    
  //   // 4. 处理 Windows 盘符格式
  //   // 情况 A: "E/folder/file.mp4" -> "E:/folder/file.mp4"
  //   path = path.replace(/^([a-zA-Z])\//, '$1:/');
    
  //   // 情况 B: "/E:/folder/file.mp4" -> "E:/folder/file.mp4" (移除开头多余的斜杠)
  //   path = path.replace(/^\/([a-zA-Z]:)/, '$1');
    
  //   // 情况 C: 确保盘符后有且仅有一个斜杠 "E://folder" -> "E:/folder"
  //   path = path.replace(/^([a-zA-Z]:)\/*/, '$1/');
    
  //   console.log(`[Media Protocol] Request: ${request.url} -> Path: ${path}`);
    
  //   // 5. 直接返回文件路径，Electron 会处理剩下的所有事情
  //   callback({ path });
  // });


  protocol.handle('media', (request) => {
    // 1. 获取原始 URL 并移除 scheme
    let rawPath = request.url.replace(/^media:\/\//, '');
    
    // 2. 解码 URI 组件
    let path = decodeURIComponent(rawPath);
    
    // 3. 处理路径分隔符
    path = path.replace(/\\/g, '/');
    
    // 4. 处理 Windows 盘符
    // "E/folder" -> "E:/folder"
    path = path.replace(/^([a-zA-Z])\//, '$1:/');
    // "/E:/folder" -> "E:/folder"
    path = path.replace(/^\/([a-zA-Z]:)/, '$1');
    
    // 5. 构造 file:// URL
    const fileUrl = `file:///${path}`;

    console.log(`[Media Protocol] Request: ${request.url} -> File: ${fileUrl}`);

    // 6. 关键：转发请求头 (Headers)，特别是 Range 头
    // 这让 FFmpeg 可以进行 Seek 操作，防止 "data source error"
    return net.fetch(fileUrl, {
      method: request.method,
      headers: request.headers, 
      bypassCustomProtocolHandlers: true
    });
  });

  // Handle media protocol
//    protocol.handle('media', (request) => {
//     // 1. Get raw URL
//     let url = request.url;
    
//     // 2. Remove scheme
//     let path = url.replace(/^media:\/\//, '');
    
//     // 3. Decode URI components (spaces, special chars)
//     path = decodeURIComponent(path);
    
//     // 4. Normalize backslashes to forward slashes
//     path = path.replace(/\\/g, '/');
    
//     // 5. Handle Windows drive letters properly
    
//     // 新增：如果盘符后没有冒号，则添加一个。例如 "E/folder/file.mp4" -> "E:/folder/file.mp4"
//     path = path.replace(/^([a-zA-Z])\//, '$1:/');
    
//     // Remove leading slash if it precedes a drive letter pattern (e.g., "/E:/folder/file.mp4" -> "E:/folder/file.mp4")
//     path = path.replace(/^\/([a-zA-Z]):\//, '$1:/');
    
//     // Ensure drive letter has only one slash after colon (e.g., "E://folder/file.mp4" -> "E:/folder/file.mp4")
//     path = path.replace(/^([a-zA-Z]):\/*/, '$1:/');
    
//     // Construct file URL - for Windows, we need file:///E:/path format
//     let fileUrl: string;
//     if (/^[a-zA-Z]:\//.test(path)) {
//       // Windows path like E:/folder/file.mp4
//       fileUrl = `file:///${path}`;
//     } else {
//       // Other path
//       fileUrl = `file://${path.startsWith('/') ? path : '/' + path}`;
//     }
    
//     console.log(`Media Protocol: ${url} -> ${path} -> ${fileUrl}`);
    
//     // Check if file exists before trying to fetch it
//     try {
//       const fs = require('fs');
//       // For file system checks, we use the path directly (works for Windows)
//       if (!fs.existsSync(path)) {
//         console.error(`File not found: ${path}`);
//         // Return a response that indicates the file was not found
//         return new Response('File not found', { status: 404 });
//       }
//     } catch (error) {
//       console.error('Error checking file existence:', error);
//     }

//        const fs = require('fs');
//     console.log(`[Media Protocol] Original URL: ${url}`);
// console.log(`[Media Protocol] Parsed path: ${path}`);
// console.log(`[Media Protocol] File exists: ${fs.existsSync(path)}`);
// console.log(`[Media Protocol] File URL: ${fileUrl}`);
    
//     return net.fetch(fileUrl);
//   });

// protocol.handle('media', (request) => {
//     // 1. 解析路径 (与之前相同)
//     let path = request.url.replace(/^media:\/\//, '');
//     path = decodeURIComponent(path);
//     path = path.replace(/\\/g, '/');
//     path = path.replace(/^([a-zA-Z])\//, '$1:/');
//     path = path.replace(/^\/([a-zA-Z]):\//, '$1:/');
//     path = path.replace(/^([a-zA-Z]):\/*/, '$1:/');

//     console.log(`[Media Protocol] Handling request for path: ${path}`);
// const fs = require('fs');
//     try {
//         // 2. 检查文件是否存在
//         if (!fs.existsSync(path)) {
//             console.error(`[Media Protocol] File not found: ${path}`);
//             return new Response('File not found', { status: 404 });
//         }

//         // 3. 获取文件信息
//         const stats = fs.statSync(path);
//         const fileSize = stats.size;
//         const range = request.headers.get('range');

//         // 4. 处理范围请求 (Range Request)
//         if (range) {
//             const parts = range.replace(/bytes=/, "").split("-");
//             const start = parseInt(parts[0], 10);
//             const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
//             const chunksize = (end - start) + 1;
            
//             // 创建一个只读取请求范围的文件流
//             const fileStream = fs.createReadStream(path, { start, end });

//             console.log(`[Media Protocol] Serving partial content: bytes ${start}-${end}/${fileSize}`);

//             // 返回 206 Partial Content 响应
//             return new Response(fileStream as any, {
//                 status: 206,
//                 headers: {
//                     'Content-Range': `bytes ${start}-${end}/${fileSize}`,
//                     'Accept-Ranges': 'bytes',
//                     'Content-Length': chunksize.toString(),
//                     'Content-Type': 'video/mp4', // 确保 MIME 类型正确
//                 }
//             });
//         } else {
//             // 5. 如果没有范围请求，则返回整个文件
//             console.log(`[Media Protocol] Serving full content: ${fileSize} bytes`);

//             const fileStream = fs.createReadStream(path);
            
//             // 返回 200 OK 响应
//             return new Response(fileStream as any, {
//                 status: 200,
//                 headers: {
//                     'Content-Length': fileSize.toString(),
//                     'Content-Type': 'video/mp4',
//                     'Accept-Ranges': 'bytes' // 告知客户端支持范围请求
//                 }
//             });
//         }
//     } catch (error) {
//         console.error(`[Media Protocol] Error serving file ${path}:`, error);
//         return new Response('Internal Server Error', { status: 500 });
//     }
// });


// protocol.handle('media', (request) => {
//     // 1. 解析 URL (移除 media:// 前缀)
//     let rawPath = request.url.replace(/^media:\/\//, '');
    
//     // 2. 解码 URI 组件 (处理空格、中文等)
//     let path = decodeURIComponent(rawPath);
    
//     // 3. 规范化路径分隔符 (Windows 兼容)
//     path = path.replace(/\\/g, '/');
    
//     // 4. 处理盘符 (例如 "E/folder" -> "E:/folder")
//     // 确保盘符后面有冒号
//     path = path.replace(/^([a-zA-Z])\//, '$1:/');
//     // 确保开头没有多余的斜杠 (例如 "/E:/..." -> "E:/...")
//     path = path.replace(/^\/([a-zA-Z]:)/, '$1');
    
//     console.log(`[Media Protocol] Request: ${request.url} -> Path: ${path}`);
    
//     // 5. 构造 file:// URL
//     // Windows 上需要三个斜杠: file:///E:/path/to/file
//     const fileUrl = `file:///${path}`;

//     // 6. 关键步骤：使用 net.fetch 并转发请求头 (尤其是 Range 头)
//     return net.fetch(fileUrl, {
//       method: request.method,
//       headers: request.headers, // <--- 这里是修复视频播放错误的关键！
//       bypassCustomProtocolHandlers: true
//     });
//   });
  createWindow();

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
  // Register all IPC handler modules
  registerVideoMetadataHandler();
  registerScreenshotHandlers();
  registerCoverHandlers();
  registerSettingsHandlers();
  registerMetadataPersistenceHandlers(metadataManager);
  registerTagHandlers();
  registerTagCoverHandlers();
  
  // Get startup result
  ipcMain.handle('get-startup-result', async () => {
    return startupResult;
  });

  // Update configuration
  ipcMain.handle('update-configuration', async (_, config) => {
    try {
      const settingsManager = new SettingsManager();

      settingsManager.setVideoSourcePath(config.videoSource);
      settingsManager.setStagedPath(config.staged_path);
      settingsManager.setScreenshotExportPath(config.screenshotExportPath);

      // Re-run startup
      startupResult = await startupService.startup();

      return { success: true, result: startupResult };
    } catch (error) {
      console.error('Failed to update configuration:', error);
      return { success: false, error: String(error) };
    }
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
