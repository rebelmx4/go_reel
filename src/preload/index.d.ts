import { ElectronAPI } from '@electron-toolkit/preload'
import { Annotation } from '../main/data/json/AnnotationManager'
import { Screenshot } from '../main/data/assets/ScreenshotManager'

import type { FileProfile } from '../main/data/json/FileProfileManager';

import type { 
  Annotation, 
  VideoFile, 
  StartupResult,
  TagLibrary
} from '../shared/models'; 

import type { 
  AppSettings,
  KeyBindingsConfig
} from '../shared/settings.schema'; 


declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // Startup & Configuration
      getStartupResult: () => Promise<StartupResult>
      updateConfiguration: (config: { videoSource: string; stagedPath: string; screenshotExportPath: string }) => Promise<{ success: boolean; error?: string; result?: any }>
      selectDirectory: () => Promise<string | null>
      refreshFiles: () => Promise<{ success: boolean; error?: string; result?: any }>
      
      // Window Control
      windowMinimize: () => Promise<void>
      windowMaximize: () => Promise<void>
      windowClose: () => Promise<void>
      windowResize: (width: number, height: number) => Promise<void>
      getScreenSize: () => Promise<{ width: number; height: number }>

       //  File staging 
      moveToTrash: (filePath: string) => Promise<string>;
      moveToEdited: (filePath: string) => Promise<string>;
      moveToTranscoded: (filePath: string) => Promise<string>;
      showInExplorer: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      openVideoSourceDir: () => Promise<{ success: boolean; error?: string }>;

      // Screenshot Management
      saveManualScreenshot: (fielPath: string, timestamp: number) => Promise<boolean>
      loadScreenshots: (fielPath: string) => Promise<Screenshot[]>
      deleteScreenshot: (fielPath: string, filename: string) => Promise<void>
      
      // Cover Management
      getCover: (fielPath: string) => Promise<string>
      setManualCover: (fielPath: string, screenshotPath: string) => Promise<boolean>
      
      // Export
      exportScreenshots: (fielPath: string, rotation: number) => Promise<void>
      
      // Video Metadata
      calculateVideoHash: (filePath: string) => Promise<string | null>
      getVideoMetadata: (videoPath: string) => Promise<VideoMetadata>

      // annotation
      addAnnotation: (fielPath: string, annotation: Annotation) => Promise<{ success: boolean; error?: string }>
      updateAnnotation: (fielPath: string, updates: Partial<Annotation>) => Promise<{ success: boolean; error?: string }>
      getAnnotation: (fielPath: string) => Promise<Annotation | null>
      
      // File Profile 相关接口...
      getFileProfile: (filePath: string) => Promise<FileProfile | null>
      getProfilesByHash: (hash: string) => Promise<FileProfile[] | null>
          
      // Settings
      getAssetStatistics: () => Promise<{ total_indexed_videos: string; total_disk_usage: string; }>
      getPathOverview: () => Promise<{
        video_source: string;
        data_directory: string;
        pending_delete_path: string;
        processed_archive_path: string;
        screenshot_export_path: string;
      }>
      getKeyBindings: () => Promise<KeyBindingsConfig>
      saveKeyBindings: (newKeyBindings: KeyBindingsConfig) => Promise<{ success: boolean; conflicts?: Record<string, string[]> }>
      loadSettings: () => Promise<AppSettings>
      updateSettings: (settings: any) => Promise<{ success: boolean }>; // 新增
      openPathInExplorer: (path: string) => Promise<{ success: boolean; error?: string }>;
      
      // --- Tags (标签管理系统) ---
      /** 原子创建标签：文字+封面一次性提交 */
      addTag: (params: { keywords: string; group: string; description?: string; imageBase64: string }) => Promise<Tag>
      /** 替换已有标签的封面 */
      replaceTagCover: (params: { tagId: number; imageBase64: string }) => Promise<{ success: boolean; imagePath: string }>
      /** 加载完整标签库定义 */
      loadTagLibrary: () => Promise<TagLibrary>
      /** 批量保存标签数据（排序/重组） */
      saveTags: (tagsData: Record<string, Tag[]>) => Promise<void>
      /** 置顶标签管理 */
      loadPinnedTags: () => Promise<PinnedTag[]>
      savePinnedTags: (pinnedTags: PinnedTag[]) => Promise<void>
      /** 视频-标签关联关系 */
      loadVideoTags: (filePath: string) => Promise<number[]>
      
      // Refresh
      refreshFiles: () => Promise<any>
      
      // Video Export
      exportVideo: (videoPath: string, clips: any[]) => Promise<any>

       // History Management (New)
      addHistory: (filePath: string) => Promise<void>
      getHistory: () => Promise<string[]>
      clearHistory: () => Promise<void>
      removeFromHistory: (filePath: string) => Promise<void>
    }
  }
}