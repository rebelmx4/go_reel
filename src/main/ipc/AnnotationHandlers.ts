import { ipcMain } from 'electron';
import { annotationManager } from '../data/json/AnnotationManager';
import { Annotation } from '../../shared/models';
import { withHash } from '../utils/handlerHelper';

export function registerAnnotationHandlers() {
  // 添加 or 更新
  ipcMain.handle('update-annotation', async (_, filePath: string, updates: Partial<Annotation>) => {
    try {
      await withHash(filePath, (hash) => annotationManager.updateAnnotation(hash, updates));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('get-annotation', async (_, filePath: string) => {
    return withHash(filePath, (hash) => annotationManager.getAnnotation(hash));
  });
}