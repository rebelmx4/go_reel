import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Annotation } from '../shared/models'; 

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

  // File staging
  moveToTrash: (filePath: string) =>
    ipcRenderer.invoke('move-file-to-trash', filePath),
  moveToEdited: (filePath: string) =>
    ipcRenderer.invoke('move-file-to-edited', filePath),
  moveToTranscoded: (filePath: string) =>
    ipcRenderer.invoke('move-file-to-transcoded', filePath),
  showInExplorer: (filePath: string) => 
    ipcRenderer.invoke('show-in-explorer', filePath),
  
  // Screenshot Management
  saveManualScreenshot: (filePath: string, timestamp: number) =>
    ipcRenderer.invoke('save-manual-screenshot', filePath, timestamp),
  generateAutoScreenshots: (filePath: string) =>
    ipcRenderer.invoke('generate-auto-screenshots', filePath),
  loadScreenshots: (filePath: string) =>
    ipcRenderer.invoke('load-screenshots', filePath),
  deleteScreenshot: (filePath: string, filename: string) =>
    ipcRenderer.invoke('delete-screenshot', filePath, filename),
   exportScreenshots: (filePath: string, rotation: number) =>
    ipcRenderer.invoke('export-screenshots', filePath, rotation),
  
  // Cover Management
  getCover: (filePath: string, videoPath: string) =>
    ipcRenderer.invoke('get-cover', filePath, videoPath),
  setManualCover: (filePath: string, screenshotPath: string) =>
    ipcRenderer.invoke('set-manual-cover', screenshotPath, filePath),
  
  
  // Video Metadata
  calculateVideoHash: (filePath: string) => 
    ipcRenderer.invoke('calculate-video-hash', filePath),
  getVideoMetadata: (videoPath: string) =>
    ipcRenderer.invoke('get-video-metadata', videoPath),
  

   // History Management
  addHistory: (filePath: string) => 
    ipcRenderer.invoke('add-history', filePath),
  getHistory: () => 
    ipcRenderer.invoke('get-history'),
  clearHistory: () => 
    ipcRenderer.invoke('clear-history'),
  removeFromHistory: (filePath: string) => 
    ipcRenderer.invoke('remove-from-history', filePath),
  

  // Annotation 语义化操作
  addAnnotation: (filePath: string, annotation: Annotation) => 
    ipcRenderer.invoke('add-annotation', filePath, annotation),
  updateAnnotation: (filePath: string, updates: Partial<Annotation>) => 
    ipcRenderer.invoke('update-annotation', filePath, updates),
  getAnnotation: (filePath: string) => 
    ipcRenderer.invoke('get-annotation', filePath),
    
  // File Profile
  getFileProfile: (filePath: string) => 
    ipcRenderer.invoke('get-file-profile', filePath),
  getProfilesByHash: (hash: string) => 
    ipcRenderer.invoke('get-profiles-by-hash', hash),
  
  
  // Settings
  getAssetStatistics: () => ipcRenderer.invoke('get-asset-statistics'),
  getPathOverview: () => ipcRenderer.invoke('get-path-overview'),
  getKeyBindings: () => ipcRenderer.invoke('get-key-bindings'),
  saveKeyBindings: (keyBindings: any) => ipcRenderer.invoke('save-key-bindings', keyBindings),
  loadSettings: () =>
    ipcRenderer.invoke('load-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings), // 新增
  openPathInExplorer: (path: string) => ipcRenderer.invoke('open-path-in-explorer', path),
  
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