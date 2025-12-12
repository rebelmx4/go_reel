import { ElectronAPI } from '@electron-toolkit/preload'
import { Annotation } from '../main/data/json/AnnotationManager'
import { Screenshot } from '../main/data/assets/ScreenshotManager'

// 根据 `SettingsManager.ts` 定义的完整设置类型
// 这使得前端在调用 `loadSettings` 和 `saveKeyBindings` 等接口时拥有完整的类型提示
type KeyBindings = {
  global: {
    view_nav: Record<string, string>;
    play_control: Record<string, string>;
    capture: Record<string, string>;
    interact: Record<string, string>;
    edit_tag: Record<string, string>;
    system: Record<string, string>;
  };
  dialog_assign_tag: {
    quick_assign_tags: Record<string, string>;
    system: Record<string, string>;
  };
};

interface AppSettings {
  paths: {
    video_source: string;
    staged_path: string;
    screenshot_export_path: string;
  };
  playback: {
    global_volume: number;
    like_decay_rate: number;
  };
  skip_frame: {
    skip_duration: number;
    rules: {
      [key: string]: number;
    };
  };
  key_bindings: KeyBindings;
}


declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // Startup & Configuration
      getStartupResult: () => Promise<any>
      updateConfiguration: (config: { videoSource: string; stagedPath: string; screenshotExportPath: string }) => Promise<{ success: boolean; error?: string; result?: any }>
      selectDirectory: () => Promise<string | null>
      refreshFiles: () => Promise<{ success: boolean; error?: string; result?: any }>
      
      // Window Control
      windowMinimize: () => Promise<void>
      windowMaximize: () => Promise<void>
      windowClose: () => Promise<void>
      windowResize: (width: number, height: number) => Promise<void>
      getScreenSize: () => Promise<{ width: number; height: number }>
      
      // Screenshot Management
      saveManualScreenshot: (videoHash: string, videoPath: string, timestamp: number) => Promise<boolean>
      generateAutoScreenshots: (videoHash: string, videoPath: string) => Promise<boolean>
      loadScreenshots: (videoHash: string) => Promise<Screenshot[]>
      deleteScreenshot: (videoHash: string, filename: string) => Promise<void>
      
      // Cover Management
      getCover: (videoHash: string, videoPath: string) => Promise<string>
      setManualCover: (screenshotPath: string, videoHash: string) => Promise<void>
      isScreenshotCover: (screenshotFilename: string, videoHash: string) => Promise<boolean>
      saveCover: (videoHash: string, dataUrl: string, isDefault: boolean) => Promise<string>
      
      // Export
      exportScreenshots: (videoHash: string, rotation: number) => Promise<void>
      
      // Video Metadata
      calculateVideoHash: (filePath: string) => Promise<string | null>
      getVideoMetadata: (videoPath: string) => Promise<{ duration: number; width: number; height: number; framerate: number }>

      // annotation
      addAnnotation: (videoHash: string, annotation: Annotation) => Promise<{ success: boolean; error?: string }>
      getAnnotation: (videoHash: string) => Promise<Annotation | null>
      updateAnnotation: (videoHash: string, updates: Partial<Annotation>) => Promise<{ success: boolean; error?: string }>
      getAllAnnotations: () => Promise<Array<[string, Annotation]>>
      getFavoriteAnnotations: () => Promise<Array<[string, Annotation]>>
      getAnnotationsByLikeCount: (threshold: number) => Promise<Array<[string, Annotation]>>
      getAnnotationsByTag: (tagId: number) => Promise<Array<[string, Annotation]>>
          
      // Settings
      getAssetStatistics: () => Promise<{ total_indexed_videos: string; total_disk_usage: string; }>
      getPathOverview: () => Promise<{
        video_source: string;
        data_directory: string;
        pending_delete_path: string;
        processed_archive_path: string;
        screenshot_export_path: string;
      }>
      getKeyBindings: () => Promise<KeyBindings>
      saveKeyBindings: (newKeyBindings: KeyBindings) => Promise<{ success: boolean; conflicts?: Record<string, string[]> }>
      loadSettings: () => Promise<AppSettings>
      updateSettings: (settings: any) => Promise<{ success: boolean }>; // 新增
      openPathInExplorer: (path: string) => Promise<{ success: boolean; error?: string }>;
      
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