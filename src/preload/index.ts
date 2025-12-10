import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Startup & Configuration
  getStartupResult: () => ipcRenderer.invoke('get-startup-result'),
  updateConfiguration: (config: {
    videoSource: string
    pendingDeletePath: string
    processedPath: string
    screenshotExportPath: string
  }) => ipcRenderer.invoke('update-configuration', config),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  refreshFiles: () => ipcRenderer.invoke('refresh-files'),

  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowResize: (width: number, height: number) => 
    ipcRenderer.invoke('window-resize', width, height),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  
  // Screenshot Management
  saveManualScreenshot: (videoHash: string, videoPath: string, timestamp: number) =>
    ipcRenderer.invoke('save-manual-screenshot', videoHash, videoPath, timestamp),
  generateAutoScreenshots: (videoHash: string, videoPath: string) =>
    ipcRenderer.invoke('generate-auto-screenshots', videoHash, videoPath),
  loadScreenshots: (videoHash: string) =>
    ipcRenderer.invoke('load-screenshots', videoHash),
  deleteScreenshot: (videoHash: string, filename: string) =>
    ipcRenderer.invoke('delete-screenshot', videoHash, filename),
  
  // Cover Management
  getCover: (videoHash: string, videoPath: string) =>
    ipcRenderer.invoke('get-cover', videoHash, videoPath),
  setManualCover: (screenshotPath: string, videoHash: string) =>
    ipcRenderer.invoke('set-manual-cover', screenshotPath, videoHash),
  isScreenshotCover: (screenshotFilename: string, videoHash: string) =>
    ipcRenderer.invoke('is-screenshot-cover', screenshotFilename, videoHash),
  saveCover: (videoHash: string, dataUrl: string, isDefault: boolean) =>
    ipcRenderer.invoke('save-cover', videoHash, dataUrl, isDefault),
  
  // Export
  exportScreenshots: (videoHash: string, rotation: number, exportPath: string) =>
    ipcRenderer.invoke('export-screenshots', videoHash, rotation, exportPath),
  
  // Video Metadata
   calculateVideoHash: (filePath: string) => 
    ipcRenderer.invoke('calculate-video-hash', filePath),
  getVideoMetadata: (videoPath: string) =>
    ipcRenderer.invoke('get-video-metadata', videoPath),
  saveVideoRotation: (videoPath: string, rotation: number) =>
    ipcRenderer.invoke('save-video-rotation', videoPath, rotation),
  loadVideoRotation: (videoPath: string) =>
    ipcRenderer.invoke('load-video-rotation', videoPath),
  
  // Settings
  saveVolume: (volume: number) =>
    ipcRenderer.invoke('save-volume', volume),
  loadVolume: () =>
    ipcRenderer.invoke('load-volume'),
  loadSettings: () =>
    ipcRenderer.invoke('load-settings'),
  
  // Tags
  loadTags: () =>
    ipcRenderer.invoke('load-tags'),
  saveTags: (tagsData: any) =>
    ipcRenderer.invoke('save-tags', tagsData),
  loadPinnedTags: () =>
    ipcRenderer.invoke('load-pinned-tags'),
  savePinnedTags: (pinnedTags: Array<{ tagId: number; position: number }>) =>
    ipcRenderer.invoke('save-pinned-tags', pinnedTags),
  loadVideoTags: (videoPath: string) =>
    ipcRenderer.invoke('load-video-tags', videoPath),
  saveVideoTags: (videoPath: string, tagIds: number[]) =>
    ipcRenderer.invoke('save-video-tags', videoPath, tagIds),
  saveTagCover: (tagId: number, dataUrl: string) =>
    ipcRenderer.invoke('save-tag-cover', tagId, dataUrl),
  
  // Video Export
  exportVideo: (videoPath: string, clips: any[]) =>
    ipcRenderer.invoke('export-video', videoPath, clips)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
