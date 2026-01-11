// FileManager.ts
import * as path from 'path';
import * as fs  from 'fs-extra';
import { settingsManager } from '../json/SettingsManager';
import log from 'electron-log';
import { shell } from 'electron';

export class FileManager {
  /** 内部工具：确保目录存在 */
  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.ensureDir(dir);
    } catch (err) {
      log.error(`[FileManager] ensureDir failed: ${dir}`, err);
      throw err;
    }
  }

  /** 生成 1–10000 的随机整数 */
  private rand1w(): number {
    return Math.floor(Math.random() * 10000) + 1;
  }

  /**
   * 平铺目录下生成唯一文件名
   * @param destDir  目标目录（已存在）
   * @param baseName 原始文件名（含扩展名）
   * @returns 可用的完整路径
   */
  private async uniquePath(destDir: string, baseName: string): Promise<string> {
    let target = path.join(destDir, baseName);
    if (!await fs.pathExists(target)) return target;

    const ext   = path.extname(baseName);
    const name  = path.basename(baseName, ext);

    for (let attempt = 0; attempt < 200; attempt++) {
      const newName = `${name}_${this.rand1w()}${ext}`;
      target = path.join(destDir, newName);
      if (!await fs.pathExists(target)) return target;
    }

    throw new Error(`[FileManager] too many conflicts for ${baseName}`);
  }

  /** 通用移动逻辑（平铺） */
  private async moveTo(
    srcFile: string,
    category: '待删除' | '已编辑' | '已转码'
  ): Promise<string> {
    if (!await fs.pathExists(srcFile)) {
      throw new Error(`[FileManager] source file not exist: ${srcFile}`);
    }

    const stagedRoot = settingsManager.getStagedPath();
    if (!stagedRoot) {
      throw new Error('[FileManager] staged_path is empty in settings');
    }

    const targetDir = path.join(stagedRoot, category);
    await this.ensureDir(targetDir);

    const finalPath = await this.uniquePath(targetDir, path.basename(srcFile));
    await fs.move(srcFile, finalPath);
    log.info(`[FileManager] moved to ${category}: ${finalPath}`);
    return finalPath;
  }

  /* ================ 对外接口 ================ */

  public async moveToTrash(filePath: string): Promise<string> {
    return this.moveTo(filePath, '待删除');
  }

  public async moveToEdited(filePath: string): Promise<string> {
    return this.moveTo(filePath, '已编辑');
  }

  public async moveToTranscoded(filePath: string): Promise<string> {
    return this.moveTo(filePath, '已转码');
  }

  /**
   * 在操作系统的资源管理器中打开路径并选中文件
   */
  public async  showInExplorer(filePath: string): Promise<void> {
    try {
      // showItemInFolder 会打开文件夹并高亮显示该文件
      shell.showItemInFolder(filePath);
      log.info(`[FileManager] showInExplorer: ${filePath}`);
    } catch (err) {
      log.error(`[FileManager] showInExplorer failed: ${filePath}`, err);
      throw err;
    }
  }

}

export const fileManager = new FileManager();