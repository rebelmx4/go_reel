import { ipcMain } from 'electron';
import { annotationManager } from '../data/json/AnnotationManager';
import { Annotation } from '../../shared/models';
import { withHash } from '../utils/handlerHelper';

export function registerAnnotationHandlers() {
  // 新增：明确的添加接口
  ipcMain.handle('add-annotation', async (_, filePath: string, annotation: Annotation) => {
    try {
      await withHash(filePath, (hash) => annotationManager.addAnnotation(hash, annotation));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 更新：仅部分修改
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