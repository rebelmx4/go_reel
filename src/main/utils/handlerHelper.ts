// src/main/utils/handlerHelper.ts

import { fileProfileManager } from '../data/json/FileProfileManager';
import log from 'electron-log';

/**
 * 这是一个高阶包装函数。
 * 它接收一个文件路径，自动通过 FileProfileManager 获取（或计算）Hash，
 * 然后执行传入的业务逻辑。
 */
export async function withHash<T>(
  filePath: string,
  action: (hash: string) => T | Promise<T>
): Promise<T> {
  try {
    const profile = await fileProfileManager.getProfile(filePath);
    if (!profile) {
      throw new Error(`无法获取文件档案: ${filePath}`);
    }
    // 执行真正的业务逻辑（如 Cover, Annotation, Screenshot）
    return await action(profile.hash);
  } catch (error) {
    log.error(`[withHash] 处理失败 (Path: ${filePath}):`, error);
    throw error; // 抛出错误让 IPC 调用者捕获
  }
}