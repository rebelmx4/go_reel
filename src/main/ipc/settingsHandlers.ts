/**
 * 设置相关的 IPC (进程间通信) 处理器
 * 负责处理渲染进程 (前端页面) 发来的关于应用设置的读取和保存请求
 * 严格按照 `其他 - 设置.md` 文档的需求实现
 */

import { ipcMain } from 'electron';
import path from 'path';
import { preferenceManager, storageManager } from '../data/json'; 
import { PreferenceSettings } from '../../shared';

/**
 * 注册所有与设置相关的 IPC 处理器
 */
export function registerSettingsHandlers() {

  // --- 模块一: 资产统计 (Asset Statistics) ---

  /**
   * 获取资产统计信息
   * 注意: 此数据并非来自 settings.json，而是需要由其他模块（如数据库或文件扫描模块）动态计算。
   * 此处为一个占位符实现，实际应用中需替换为真实的数据源调用。
   */
  ipcMain.handle('get-asset-statistics', async () => {
    // 示例: 在实际应用中，您会调用类似 `libraryManager.getVideoCount()` 的方法
    const totalFiles = 15231; // 假设值
    const totalSizeInBytes = 1592949165260; // 假设值 (约 1.45 TB)

    // 此处可以添加一个辅助函数来格式化字节大小
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      total_indexed_videos: totalFiles.toLocaleString(), // e.g., "15,231"
      total_disk_usage: formatBytes(totalSizeInBytes), // e.g., "1.45 TB"
    };
  });

  // --- 模块二: 路径概览 (Path Overview) ---

  /**
   * 获取所有用于概览的核心路径
   * @returns {Promise<object>} 包含所有核心路径的对象
   */
  ipcMain.handle('get-path-overview', async () => {
    return {
      video_source: storageManager.getVideoSourcePath(),
      data_directory: path.join(process.cwd(), 'data'), // 数据存储目录是固定的
      pending_delete_path: storageManager.getTrashPath(), // 待删除目录
      processed_archive_path: storageManager.getEditedPath(), // 已处理归档目录
      screenshot_export_path: storageManager.getScreenshotExportPath(),
    };
  });

  // --- 模块三: 快捷键配置 (Shortcut Customization) ---
  
  /**
   * 获取所有快捷键绑定
   */
  ipcMain.handle('get-key-bindings', async () => {
    return preferenceManager.getKeyBindings();
  });

  /**
   * 保存更新后的快捷键配置，并执行冲突检测
   * @param _ - IpcMainInvokeEvent
   * @param {AppSettings['key_bindings']} newKeyBindings - 从前端传来的新快捷键配置
   * @returns {Promise<{success: boolean, conflicts?: any}>} 返回操作结果和冲突详情
   */
  ipcMain.handle('save-key-bindings', async (_, newKeyBindings: PreferenceSettings['key_bindings']) => {
    const allConflicts: Record<string, string[]> = {};

    // 遍历每一个快捷键上下文 (e.g., 'global', 'dialog_assign_tag')
    for (const context in newKeyBindings) {
      const contextBindings = newKeyBindings[context as keyof typeof newKeyBindings];
      const seenShortcuts: Record<string, string> = {}; // 用于存储 "快捷键 -> 功能名" 的映射
      const contextConflicts: Set<string> = new Set(); // 存储当前上下文内冲突的功能名

      // 遍历该上下文下的所有功能分组 (e.g., 'view_nav', 'play_control')
      for (const group in contextBindings) {
        const groupBindings = contextBindings[group as keyof typeof contextBindings];
        // 遍历分组内的每一个功能
        for (const functionName in groupBindings) {
          const shortcut = groupBindings[functionName];

          // 如果快捷键已被使用
          if (seenShortcuts[shortcut]) {
            // 标记当前功能和之前使用该快捷键的功能为冲突
            contextConflicts.add(functionName);
            contextConflicts.add(seenShortcuts[shortcut]);
          } else {
            seenShortcuts[shortcut] = functionName;
          }
        }
      }
      
      if (contextConflicts.size > 0) {
        allConflicts[context] = Array.from(contextConflicts);
      }
    }

    // 根据冲突检测结果进行处理
    if (Object.keys(allConflicts).length > 0) {
      // 情况 B: 发现冲突
      console.error('快捷键保存失败，发现冲突:', allConflicts);
      return { success: false, conflicts: allConflicts };
    } else {
      // 情况 A: 无任何冲突
      preferenceManager.setKeyBindings(newKeyBindings);
      console.log('快捷键设置已成功保存。');
      // 后续应在此处或通过事件通知相关模块重新加载快捷键监听器
      return { success: true };
    }
  });

  // --- 提供一个获取所有设置的通用接口 ---
  /**
   * 加载所有设置 (用于设置页面的初始数据填充)
   */
  ipcMain.handle('load-settings', async () => {
    return preferenceManager.getData();
  });

  /**
   *  通用设置更新接口
   * @param _ - IpcMainInvokeEvent
   * @param {Partial<PreferenceSettings>} settingsToUpdate - 包含要更新的键值对的对象
   * @returns {Promise<{success: boolean}>}
   */
  ipcMain.handle('update-preference-settings', async (_, settingsToUpdate: Partial<PreferenceSettings>) => {
    try {
      preferenceManager.set(settingsToUpdate);
      console.log('Settings updated:', settingsToUpdate);
      return { success: true };
    } catch (error) {
      console.error('Failed to update settings:', error);
      return { success: false };
    }
  });
}