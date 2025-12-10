import { ElectronAPI } from '@electron-toolkit/preload'

export interface Screenshot {
  filename: string
  timestamp: number
  path: string
  type: 'manual' | 'auto'
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // Startup & Configuration
      getStartupResult: () => Promise<any>
      updateConfiguration: (config: {
        videoSource: string
        stagedPath: string
        screenshotExportPath: string
      }) => Promise<{ success: boolean; error?: string; result?: any }>
      selectDirectory: () => Promise<string | null>
      refreshFiles: () => Promise<{ success: boolean; error?: string; result?: any }>
      
      // Window Control
      windowMinimize: () => Promise<void>
      windowMaximize: () => Promise<void>
      windowClose: () => Promise<void>
      windowResize: (width: number, height: number) => Promise<void>
      getScreenSize: () => Promise<{ width: number; height: number }>
      
      // Screenshot Management
      saveManualScreenshot: (
        videoHash: string,
        videoPath: string, 
        timestamp: number
      ) => Promise<boolean> // 返回一个布尔值表示成功与否
      generateAutoScreenshots: (
        videoHash: string,
        videoPath: string,
      ) => Promise<boolean> // 返回一个布尔值表示成功与否
      loadScreenshots: (videoHash: string) => Promise<Screenshot[]>
      deleteScreenshot: (videoHash: string, filename: string) => Promise<void>
      
      // Cover Management
      getCover: (videoHash: string, videoPath: string) => Promise<string>
      setManualCover: (screenshotPath: string, videoHash: string) => Promise<void>
      isScreenshotCover: (screenshotFilename: string, videoHash: string) => Promise<boolean>
      saveCover: (videoHash: string, dataUrl: string, isDefault: boolean) => Promise<string>
      
      // Export
      exportScreenshots: (
        videoHash: string,
        rotation: number,
        exportPath: string
      ) => Promise<void>
      
      // Video Metadata
      calculateVideoHash: (filePath: string) => Promise<string | null>
      getVideoMetadata: (videoPath: string) => Promise<{
        duration: number
        width: number
        height: number
        framerate: number
      }>
      saveVideoRotation: (videoPath: string, rotation: number) => Promise<void>
      loadVideoRotation: (videoPath: string) => Promise<number>
      
      // Settings
      saveVolume: (volume: number) => Promise<void>
      loadVolume: () => Promise<number>
      loadSettings: () => Promise<{
        volume?: number
        skip_frame?: Record<string, number>
        skip_duration?: number
        [key: string]: any
      }>
      
      // Tags
      loadTags: () => Promise<any>
      saveTags: (tagsData: any) => Promise<void>
      loadPinnedTags: () => Promise<Array<{ tagId: number; position: number }>>
      savePinnedTags: (pinnedTags: Array<{ tagId: number; position: number }>) => Promise<void>
      loadVideoTags: (videoPath: string) => Promise<number[]>
      saveVideoTags: (videoPath: string, tagIds: number[]) => Promise<void>
      saveTagCover: (tagId: number, dataUrl: string) => Promise<string>
      
      // Refresh
      refreshFiles: () => Promise<any>
      
      // Video Export
      exportVideo: (videoPath: string, clips: any[]) => Promise<any>
    }
  }
}
