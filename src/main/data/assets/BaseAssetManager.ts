import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';
import { fileProfileManager } from '../json/FileProfileManager'; 


export abstract class BaseAssetManager {
  protected baseDir: string;

  constructor(subDir: string) {
    // 严格遵循要求使用 app.getAppPath()
    this.baseDir = path.join(app.getAppPath(), 'data', subDir);
    this.ensureDirSync(this.baseDir);
  }

  /**
   * 内部工具：确保目录存在 (同步)
   */
  protected ensureDirSync(dir: string) {
    try {
      fs.ensureDirSync(dir);
    } catch (error) {
      log.error(`[BaseAssetManager] Failed to ensure directory: ${dir}`, error);
    }
  }

  /**
   * 内部私有方法：统一获取 Hash
   * 这样如果以后逻辑变了，只需要改这一处
   */
  protected async getHash(filePath: string): Promise<string> {
    const profile = await fileProfileManager.getProfile(filePath);
    if (!profile || !profile.hash) {
      throw new Error(`[ScreenshotManager] 无法获取文件档案或 Hash: ${filePath}`);
    }
    return profile.hash;
  }

  /**
   * 获取哈希前缀目录 (两级结构)
   * 对应 CoverManager 使用场景: baseDir/ab
   * @param hash 完整哈希值
   */
  protected getPrefixDir(hash: string): string {
    const prefix = (hash || '00').substring(0, 2);
    const dir = path.join(this.baseDir, prefix);
    this.ensureDirSync(dir);
    return dir;
  }

  /**
   * 获取哈希专用子目录 (三级结构)
   * 对应 ScreenshotManager 使用场景: baseDir/ab/abcdefg...
   * @param hash 完整哈希值
   */
  protected getHashDir(hash: string): string {
    const prefixDir = this.getPrefixDir(hash);
    const dir = path.join(prefixDir, hash);
    this.ensureDirSync(dir);
    return dir;
  }

  /**
   * 获取前缀目录下的文件路径
   * 常用语 Cover: baseDir/ab/abcdefg.webp
   */
  protected getFilePathInPrefix(hash: string, filename: string): string {
    return path.join(this.getPrefixDir(hash), filename);
  }

  /**
   * 获取哈希专用子目录下的文件路径
   * 常用于 Screenshot: baseDir/ab/abcdefg/00001000.webp
   */
  protected getFilePathInHash(hash: string, filename: string): string {
    return path.join(this.getHashDir(hash), filename);
  }

  /**
   * 检查路径是否存在
   */
  public async exists(targetPath: string): Promise<boolean> {
    return await fs.pathExists(targetPath);
  }

  /**
   * 删除文件或文件夹
   */
  public async delete(targetPath: string): Promise<void> {
    try {
      if (await fs.pathExists(targetPath)) {
        await fs.remove(targetPath);
      }
    } catch (error) {
      log.error(`[BaseAssetManager] Failed to delete: ${targetPath}`, error);
    }
  }

  /**
   * 列出哈希专用子目录下的所有文件
   * @param hash 完整哈希值
   */
  protected async listFilesInHashDir(hash: string): Promise<string[]> {
    const dir = this.getHashDir(hash);
    try {
      if (await fs.pathExists(dir)) {
        return await fs.readdir(dir);
      }
    } catch (error) {
      log.error(`[BaseAssetManager] Failed to list files in: ${dir}`, error);
    }
    return [];
  }

  /**
   * 写入 Buffer 数据到指定路径
   */
  protected async writeFile(filePath: string, data: Buffer): Promise<void> {
    try {
      await fs.writeFile(filePath, data);
    } catch (error) {
      log.error(`[BaseAssetManager] Failed to write file: ${filePath}`, error);
      throw error;
    }
  }
}