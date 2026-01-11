import * as path from 'path';
import * as fs  from 'fs-extra';
import { settingsManager } from '../data/json/SettingsManager';
import log from 'electron-log';
import { shell } from 'electron';
import { ipcMain } from 'electron';

export class FileSystemService {
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
    targetDir: string
  ): Promise<string> {
    if (!await fs.pathExists(srcFile)) {
      throw new Error(`[FileManager] source file not exist: ${srcFile}`);
    }

    const stagedRoot = settingsManager.getStagedPath();
    if (!stagedRoot) {
      throw new Error('[FileManager] staged_path is empty in settings');
    }

    await this.ensureDir(targetDir);

    const finalPath = await this.uniquePath(targetDir, path.basename(srcFile));
    await fs.move(srcFile, finalPath);
    log.info(`[FileManager] moved to ${finalPath}`);
    return finalPath;
  }

  /* ================ 对外接口 ================ */

   public async moveToTrash(filePath: string): Promise<string> {
    return this.moveTo(filePath, settingsManager.getTrashPath());
  }

  public async moveToEdited(filePath: string): Promise<string> {
    return this.moveTo(filePath, settingsManager.getEditedPath());
  }

  public async moveToTranscoded(filePath: string): Promise<string> {
    return this.moveTo(filePath, settingsManager.getTranscodedPath());
  }

  /**
   * 在操作系统的资源管理器中打开路径并选中文件
   */
  public async showInExplorer(filePath: string): Promise<void> {
    try {
      // showItemInFolder 会打开文件夹并高亮显示该文件
      shell.showItemInFolder(filePath);
      log.info(`[FileManager] showInExplorer: ${filePath}`);
    } catch (err) {
      log.error(`[FileManager] showInExplorer failed: ${filePath}`, err);
      throw err;
    }
  }

  /**
   * 打开指定的文件夹窗口
   * 这里就是你想要增加的功能实现
   */
  public async openDirectory(dirPath: string): Promise<void> {
    if (!dirPath) throw new Error('Path is empty');
    if (!await fs.pathExists(dirPath)) {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }
    await shell.openPath(dirPath);
  }

  /**
   * 快捷动作：直接打开视频源根目录
   */
  public async openVideoSourceDir(): Promise<void> {
    const videoPath = settingsManager.getVideoSourcePath();
    await this.openDirectory(videoPath);
    log.info(`[FileSystemService] Opened video source: ${videoPath}`);
  }

}

export const fileSystemService = new FileSystemService();

export function registerFileSytemHandlers() {
  // 移动文件到 staged_path/待删除
  ipcMain.handle('move-file-to-trash', async (_, filePath: string) => {
    try {
      const finalPath = await fileSystemService.moveToTrash(filePath);
      return { success: true, finalPath };
    } catch (err: any) {
      log.error('[IPC] move-file-to-trash failed:', err);
      return { success: false, error: err.message };
    }
  });

  // 移动文件到 staged_path/已编辑
  ipcMain.handle('move-file-to-edited', async (_, filePath: string) => {
    try {
      const finalPath = await fileSystemService.moveToEdited(filePath);
      return { success: true, finalPath };
    } catch (err: any) {
      log.error('[IPC] move-file-to-edited failed:', err);
      return { success: false, error: err.message };
    }
  });

  // 移动文件到 staged_path/已转码
  ipcMain.handle('move-file-to-transcoded', async (_, filePath: string) => {
    try {
      const finalPath = await fileSystemService.moveToTranscoded(filePath);
      return { success: true, finalPath };
    } catch (err: any) {
      log.error('[IPC] move-file-to-transcoded failed:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('show-in-explorer', async (_, filePath: string) => {
    try {
      await fileSystemService.showInExplorer(filePath);
      return { success: true };
    } catch (err: any) {
      log.error('[IPC] show-in-explorer failed:', err);
      return { success: false, error: err.message };
    }
  });

  // 打开视频根目录
  ipcMain.handle('open-video-source-dir', async () => {
    try {
      await fileSystemService.openVideoSourceDir();
      return { success: true };
    } catch (err: any) {
      log.error('[IPC] open-video-source-dir failed:', err);
      return { success: false, error: err.message };
    }
  });
}