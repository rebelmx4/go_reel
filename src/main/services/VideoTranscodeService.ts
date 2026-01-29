import path from 'path';
import fs from 'fs-extra';
import log from 'electron-log';
import { storageManager } from '../data/json/StorageManager';
import { VideoTranscodeUtils } from '../utils/VideoTranscodeUtils';
import { ipcMain } from 'electron';


export class VideoTranscodeService {
  
  /**
   * 执行视频转码并替换原文件
   * @param sourcePath 视频绝对路径
   */
  public async transcodeAndReplace(sourcePath: string): Promise<{ success: boolean; error?: string }> {
    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`文件不存在: ${sourcePath}`);
    }

    // 1. 记录原始文件状态（用于后续还原时间戳）
    const stats = await fs.stat(sourcePath);
    const originalTimes = {
      atime: stats.atime,
      mtime: stats.mtime
    };

    // 2. 准备路径
    const fileName = path.basename(sourcePath);
    // 使用专用的转码临时目录
    const tempDir = path.join(storageManager.getTranscodeWorkRoot(), 'work_dir');
    const tempOutputPath = path.join(tempDir, `transcoded_${Date.now()}_${fileName}`);

    try {
      // 3. 确保临时目录存在
      await fs.ensureDir(tempDir);

      // 4. 执行转码 (VideoTranscodeUtils 内部会处理 H264 转码)
      log.info(`[TranscodeService] 开始转码: ${sourcePath}`);
      await VideoTranscodeUtils.transcodeToH264(sourcePath, tempOutputPath, (progress) => {
        // 这里的进度可以保留，供以后扩展
        log.debug(`[TranscodeService] 进度: ${progress}% - ${fileName}`);
      });

      // 5. 物理文件流转
      // A. 将原视频移入“已转码”归档
      const archivedPath = await storageManager.moveToTranscoded(sourcePath);
      log.info(`[TranscodeService] 原视频已归档至: ${archivedPath}`);

      // B. 将转码后的新视频移回原位置
      await fs.move(tempOutputPath, sourcePath);

      // 6. 还原时间戳 (保持排序不变)
      await fs.utimes(sourcePath, originalTimes.atime, originalTimes.mtime);
      
      log.info(`[TranscodeService] 转码替换成功，已还原时间戳: ${sourcePath}`);
      return { success: true };

    } 
    catch (error: any) {
      log.error(`[TranscodeService] 转码流程失败: ${sourcePath}`, error);
      
      // 清理可能产生的临时文件
      if (await fs.pathExists(tempOutputPath)) {
        await fs.remove(tempOutputPath).catch(() => {});
      }

      return { success: false, error: error.message };
    } finally {
      // 尝试清理临时目录（如果为空）
      try {
        const files = await fs.readdir(tempDir);
        if (files.length === 0) await fs.remove(tempDir);
      } catch (e) {}
    }
  }
}

export const videoTranscodeService = new VideoTranscodeService();


export function registerVideoTranscodeHandlers() {
  /**
   * 响应前端发起的转码请求
   */
  ipcMain.handle('video:transcode', async (_, filePath: string) => {
    try {
      log.info(`[IPC] 收到转码请求: ${filePath}`);
      const result = await videoTranscodeService.transcodeAndReplace(filePath);
      
      if (result.success) {
        return { success: true, message: '转码成功' };
      } else {
        return { success: false, error: result.error || '转码过程中出现未知错误' };
      }
    } catch (error: any) {
      log.error(`[IPC] video:transcode 失败:`, error);
      return { success: false, error: error.message };
    }
  });
}