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
  showInExplorer: (filePath: string) => 
    ipcRenderer.invoke('show-in-explorer', filePath),
  openVideoSourceDir: () => 
    ipcRenderer.invoke('open-video-source-dir'), 
  
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
  getCover: (filePath: string) =>
    ipcRenderer.invoke('get-cover', filePath),
  setManualCover: (filePath: string, screenshotPath: string) =>
    ipcRenderer.invoke('set-manual-cover', filePath, screenshotPath),
  
  
  // Video Metadata
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
  updateAnnotation: (filePath: string, updates: Partial<Annotation>) => 
    ipcRenderer.invoke('update-annotation', filePath, updates),
  getAnnotation: (filePath: string) => 
    ipcRenderer.invoke('get-annotation', filePath),
  updateAnnotationsBatch: (filePaths, updates) => 
    ipcRenderer.invoke('update-annotations-batch', filePaths, updates),
    
  // File Profile
  getFileProfile: (filePath: string) => 
    ipcRenderer.invoke('get-file-profile', filePath),
  
  
  // Settings
  getAssetStatistics: () => ipcRenderer.invoke('get-asset-statistics'),
  getPathOverview: () => ipcRenderer.invoke('get-path-overview'),
  getKeyBindings: () => ipcRenderer.invoke('get-key-bindings'),
  saveKeyBindings: (keyBindings: any) => ipcRenderer.invoke('save-key-bindings', keyBindings),
  loadSettings: () =>
    ipcRenderer.invoke('load-settings'),
  updatePreferenceSettings: (settings: any) => ipcRenderer.invoke('update-preference-settings', settings), 
  
  // Tags (New & Refactored)
  addTag: (params) => ipcRenderer.invoke('add-tag', params),
  replaceTagCover: (params) => ipcRenderer.invoke('replace-tag-cover', params),
  loadTagLibrary: () => ipcRenderer.invoke('load-tag-library'),
  saveTags: (tagsData) => ipcRenderer.invoke('save-tags', tagsData),
  loadPinnedTags: () => ipcRenderer.invoke('load-pinned-tags'),
  savePinnedTags: (pinnedTags) => ipcRenderer.invoke('save-pinned-tags', pinnedTags),
  loadVideoTags: (filePath) => ipcRenderer.invoke('load-video-tags', filePath),
  updateTag: (tagId, updates) => ipcRenderer.invoke('update-tag', tagId, updates),
  
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