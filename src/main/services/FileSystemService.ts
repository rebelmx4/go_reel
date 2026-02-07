import * as path from 'path';
import * as fs  from 'fs-extra';
import { storageManager } from '../data/json';
import log from 'electron-log';
import { shell, clipboard, ipcMain } from 'electron';
import { exec } from 'child_process'; 

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

    const stagedRoot = storageManager.getStagedPath();
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
    return this.moveTo(filePath, storageManager.getTrashPath());
  }

  public async moveToEdited(filePath: string): Promise<string> {
    return this.moveTo(filePath, storageManager.getEditedPath());
  }

  public async moveToTranscoded(filePath: string): Promise<string> {
    return this.moveTo(filePath, storageManager.getTranscodedPath());
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
    const videoPath = storageManager.getVideoSourcePath();
    await this.openDirectory(videoPath);
    log.info(`[FileSystemService] Opened video source: ${videoPath}`);
  }

  
  /**
   * [新增] 清空目录：删除内容但保留目录
   */
  public async emptyDirectory(dirPath: string): Promise<void> {
    if (!dirPath) throw new Error('Path is empty');
    
    // 安全校验：防止误删根目录或关键路径
    const resolvedPath = path.resolve(dirPath);
    if (resolvedPath === path.resolve('/') || resolvedPath.endsWith(':\\')) {
      throw new Error('Cannot empty root directory');
    }

    if (await fs.pathExists(resolvedPath)) {
      await fs.emptyDir(resolvedPath);
      log.info(`[FileSystemService] Emptied directory: ${resolvedPath}`);
    }
  }

  /**
   * [新增] 拷贝目录到剪贴板：支持系统级粘贴操作
   */
    public copyDirectoryToClipboard(dirPath: string): void {
    if (!dirPath) throw new Error('Path is empty');
    
    const resolvedPath = path.resolve(dirPath);

    // 1. 先用 Electron 原生 API 写入文本，保证记事本等应用能立即粘贴路径（响应速度快）
    clipboard.writeText(resolvedPath);

    // 2. 调用 PowerShell 设置“文件路径”对象，使资源管理器支持 Ctrl+V 粘贴文件夹
    // 使用 LiteralPath 避免路径中存在 [ ] 等特殊字符时出错
    const psCommand = `powershell.exe -NoProfile -Command "Set-Clipboard -LiteralPath '${resolvedPath}'"`;

    exec(psCommand, (error) => {
      if (error) {
        log.error(`[FileSystemService] PowerShell Set-Clipboard failed:`, error);
      } else {
        log.info(`[FileSystemService] Copied directory to clipboard via PowerShell: ${resolvedPath}`);
      }
    });
  }

 /**
   * 拷贝目录到剪贴板（模拟剪切效果）
   * 采用 Base64 编码和 -Sta 模式，确保 100% 兼容
   */
  public cutDirectoryToClipboard(dirPath: string): void {
    if (!dirPath) throw new Error('Path is empty');
    
    const resolvedPath = path.resolve(dirPath);

    // 1. 写入文本
    clipboard.writeText(resolvedPath);

    // 2. 构建 PowerShell 脚本
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms;
      $files = New-Object System.Collections.Specialized.StringCollection;
      $files.Add("${resolvedPath}");
      $data = New-Object System.Windows.Forms.DataObject;
      $data.SetFileDropList($files);
      $dropEffect = New-Object System.IO.MemoryStream;
      $dropEffect.Write([byte[]](2,0,0,0), 0, 4);
      $data.SetData("Preferred DropEffect", $dropEffect);
      [System.Windows.Forms.Clipboard]::SetDataObject($data, $true);
    `;

    // --- 关键：将脚本转换为 UTF-16LE 编码的 Base64 ---
    // PowerShell 的 -EncodedCommand 要求必须是 UTF-16LE (Unicode)
    const buffer = Buffer.from(psScript, 'utf16le');
    const base64Script = buffer.toString('base64');

    // -Sta: 开启单线程单元（剪贴板必须）
    // -EncodedCommand: 接收 base64 脚本，避开所有转义问题
    const psCommand = `powershell.exe -NoProfile -Sta -EncodedCommand ${base64Script}`;

    exec(psCommand, (error) => {
      if (error) {
        log.error(`[FileSystemService] PowerShell Cut failed:`, error);
      } else {
        log.info(`[FileSystemService] Cut directory success: ${resolvedPath}`);
      }
    });
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

   // [新增] 清空目录 IPC
  ipcMain.handle('clear-directory', async (_, dirPath: string) => {
    try {
      await fileSystemService.emptyDirectory(dirPath);
      return { success: true };
    } catch (err: any) {
      log.error('[IPC] clear-directory failed:', err);
      return { success: false, error: err.message };
    }
  });

  // [新增] 拷贝目录 IPC
  ipcMain.handle('copy-directory-to-clipboard', async (_, dirPath: string) => {
    try {
      fileSystemService.cutDirectoryToClipboard(dirPath);
      return { success: true };
    } catch (err: any) {
      log.error('[IPC] copy-directory-to-clipboard failed:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('open-path-in-explorer', async (_, dirPath: string) => {
    try {
      await fileSystemService.openDirectory(dirPath);
      return { success: true };
    } catch (err: any) {
      log.error('[IPC] open-path-in-explorer failed:', err);
      return { success: false, error: err.message };
    }
  });
}