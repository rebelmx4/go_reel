// src/main/ipc/tagHandlers.ts

import { ipcMain } from 'electron';
import { tagManager } from '../data/json/TagManager';

export function registerTagHandlers() {
  /**
   * 原子化创建标签
   * 明确展开参数，确保类型安全
   */
  ipcMain.handle('add-tag', async (
    _, 
    { keywords, group, description, imageBase64 }: { 
      keywords: string; 
      group: string; 
      description?: string; 
      imageBase64: string 
    }
  ) => {
    try {
      // 调用 TagManager 的原子创建方法
      const newTag = await tagManager.addTag({
        keywords,
        group,
        description,
        imageBase64
      });
      return newTag;
    } catch (error) {
      console.error('[IPC:add-tag] Failed:', error);
      throw error;
    }
  });

  /**
   * 替换标签封面
   */
  ipcMain.handle('replace-tag-cover', async (_, { tagId, imageBase64 }: { tagId: number, imageBase64: string }) => {
    try {
      const newPath = await tagManager.replaceTagCover(tagId, imageBase64);
      return { success: true, imagePath: newPath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 加载库（用于增量刷新）
  ipcMain.handle('load-tag-library', async () => {
    return tagManager.getLibrary();
  });

  // 保存置顶配置
  ipcMain.handle('save-pinned-tags', async (_, pinnedTags) => {
    tagManager.setPinnedTags(pinnedTags);
    return { success: true };
  });
}