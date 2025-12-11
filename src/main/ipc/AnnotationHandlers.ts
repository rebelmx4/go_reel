/**
 * Video Metadata Persistence Handlers
 * Handles saving and loading per-video metadata (rotation, etc.)
 */

import { ipcMain } from 'electron';
import { annotationManager, Annotation } from '../data/json/AnnotationManager';


/**
 * Register metadata persistence handlers
 */
export function registerAnnotationHandlers() {
  /**
   * (Create) 新增一个视频的注解记录。
   * 通常在视频首次被处理时调用。
   */
  ipcMain.handle('add-annotation', async (_, hash: string, annotation: Annotation) => {
    try {
      await annotationManager.addAnnotation(hash, annotation);
      return { success: true };
    } catch (error) {
      console.error(`[IPC:add-annotation] Failed for hash ${hash}:`, error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * (Read) 通过视频哈希，获取一个视频的完整注解信息。
   */
  ipcMain.handle('get-annotation', async (_, hash: string): Promise<Annotation | null> => {
    return annotationManager.getAnnotation(hash) || null;
  });

  /**
   * (Update) 更新一个视频的部分注解信息。
   */
  ipcMain.handle('update-annotation', async (_, hash: string, updates: Partial<Annotation>) => {
    try {
      await annotationManager.updateAnnotation(hash, updates);
      return { success: true };
    } catch (error) {
      console.error(`[IPC:update-annotation] Failed for hash ${hash}:`, error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 'remove-video-annotation' 根据你的要求被省略

  // === 集合查询操作 ===

  /**
   * (ReadAll) 获取所有视频的注解记录。
   * @returns 返回一个 [hash, annotation] 元组构成的数组。
   */
  ipcMain.handle('get-all-annotations', async () => {
    return annotationManager.getAllAnnotations();
  });

  /**
   * 获取所有被标记为 "favorite" 的视频注解。
   */
  ipcMain.handle('get-favorite-annotations', async () => {
    return annotationManager.getFavorites();
  });

  /**
   * 根据 "like_count" 阈值筛选视频注解。
   */
  ipcMain.handle('get-annotations-by-like-count', async (_, threshold: number) => {
    return annotationManager.getByLikeCount(threshold);
  });

  /**
   * 根据标签 ID 筛选视频注解。
   */
  ipcMain.handle('get-annotations-by-tag', async (_, tagId: number) => {
    return annotationManager.getByTag(tagId);
  });
}
