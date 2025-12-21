import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Annotation } from '../main/data/json/index';

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
  
  // Export
  exportScreenshots: (videoHash: string, rotation: number) =>
    ipcRenderer.invoke('export-screenshots', videoHash, rotation),
  
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
  
  // Annotation
  addAnnotation: (videoHash: string, annotation: Annotation) =>
    ipcRenderer.invoke('add-annotation', videoHash, annotation),

  getAnnotation: (videoHash: string) =>
    ipcRenderer.invoke('get-annotation', videoHash),

  updateAnnotation: (videoHash: string, updates: Partial<Annotation>) =>
    ipcRenderer.invoke('update-annotation', videoHash, updates),

  getAllAnnotations: () => 
    ipcRenderer.invoke('get-all-annotations'),

  getFavoriteAnnotations: () => 
    ipcRenderer.invoke('get-favorite-annotations'),

  getAnnotationsByLikeCount: (threshold: number) =>
    ipcRenderer.invoke('get-annotations-by-like-count', threshold),
    
  getAnnotationsByTag: (tagId: number) =>
    ipcRenderer.invoke('get-annotations-by-tag', tagId),
  
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