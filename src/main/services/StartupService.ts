import log from 'electron-log';
import { settingsManager } from '../data/json/SettingsManager';
import { annotationManager } from '../data/json/AnnotationManager';
import { fileProfileManager } from '../data/json/FileProfileManager'; // 注意：FileProfile 接口已在 manager 中定义
import { historyManager } from '../data/json/HistoryManager';
import { videoMetadataManager } from '../data/json/VideoMetadataManager';
import { tagManager } from '../data/json/TagManager';
import { scanVideoFiles } from '../utils/fileScanner';
import { StartupResult, VideoFile } from '../../shared/models';// 引入共享类型
import { ipcMain } from 'electron';


export class StartupService {
  private lastResult: StartupResult | null = null;

  /**
   * 执行核心启动逻辑：物理扫描 + 档案库映射
   */
  async startup(): Promise<StartupResult> {
     // 统一初始化所有管理器
    await Promise.all([
      settingsManager.load(),
      fileProfileManager.init(),
      annotationManager.init(),
      historyManager.load(),
      videoMetadataManager.init(),
      tagManager.load()
    ]);

    log.info('=== Startup: Direct Physical Mapping ===');

    // 1. 获取基础配置
    const videoSource = settingsManager.getVideoSourcePath();
    const blacklist = [
      settingsManager.getStagedPath(), 
      settingsManager.getScreenshotExportPath()
    ].filter(Boolean);

    // 2. 物理扫描 (快速获取当前磁盘上的文件列表)
    const scannedFiles = await scanVideoFiles(videoSource, blacklist);

    // 3. 并行处理：获取档案并挂载元数据
    // 使用 Promise.all 处理 map 中的异步 getProfile 调用
    const videoList: VideoFile[] = await Promise.all(scannedFiles.map(async (file) => {
      const video: VideoFile = {
        path: file.path,
        createdAt: file.createdAt,
        mtime: file.mtime,
        size: file.size
      };

      try {
        const profile = await fileProfileManager.getProfile(file.path);

        if (profile) {
          
          const annotation = annotationManager.getAnnotation(profile.hash);
          if (annotation) {
            video.annotation = annotation;
          }
        }
      } catch (e) {
        log.error(`Failed to map profile for ${file.path}`, e);
      }

      return video;
    }));

    log.info(`Startup successful. Total: ${videoList.length}, Recognized (Hashed): ${videoList.filter(v => v.hash).length}`);

    const result: StartupResult = {
        videoList,
        history: historyManager.getHistory(),
        settings: settingsManager.get(),
        tagLibrary: tagManager.getLibrary()
      };

      this.lastResult = result;

      return result;
  }

  /**
   * 允许其他模块获取最近一次的启动/刷新结果
   */
  public getLastResult(): StartupResult | null {
    return this.lastResult;
  }
}

export function registerStartupServiceHandlers() {
  ipcMain.handle('get-startup-result', async () => {
      return startupService.getLastResult();
    });
}

export const startupService = new StartupService();