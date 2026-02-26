import path from 'path'
import fs from 'fs-extra'
import { BaseJsonManager } from './BaseJsonManager'

interface StorageSettings {
  video_source: string
  staged_path: string
  screenshot_export_path: string
}

const SUB_DIRS = {
  TRASH: '待删除',
  EDITED: '已编辑',
  TRANSCODED: '已转码',
  CROP_WORKER: '裁剪中间目录',
  TRANSCODE_WORKER: '转码中间目录' // 专门存放转码时的临时文件
} as const

export class StorageManager extends BaseJsonManager<StorageSettings> {
  constructor() {
    super('storage_paths.json', {
      video_source: '',
      staged_path: '',
      screenshot_export_path: ''
    })
  }

  // --- 基础路径获取 ---
  public getVideoSourcePath() {
    return this.data.video_source
  }
  public getStagedPath() {
    return this.data.staged_path
  }
  public getScreenshotExportPath() {
    return this.data.screenshot_export_path
  }

  // --- 派生子目录获取 ---
  public getTrashPath() {
    return path.join(this.data.staged_path, SUB_DIRS.TRASH)
  }
  public getEditedPath() {
    return path.join(this.data.staged_path, SUB_DIRS.EDITED)
  }
  public getTranscodedPath() {
    return path.join(this.data.staged_path, SUB_DIRS.TRANSCODED)
  }

  /** 获取裁剪工作的根目录 */
  public getCropWorkRoot() {
    return path.join(this.data.staged_path, SUB_DIRS.CROP_WORKER)
  }

  /** [新增] 获取转码工作的根目录 */
  public getTranscodeWorkRoot() {
    return path.join(this.data.staged_path, SUB_DIRS.TRANSCODE_WORKER)
  }

  // --- 内部文件流转逻辑 ---

  /**
   * [修改为 public] 核心移动逻辑：带随机后缀重命名以防冲突
   */
  public async moveWithConflictHandling(src: string, destDir: string): Promise<string> {
    await fs.ensureDir(destDir)
    const fileName = path.basename(src)
    let targetPath = path.join(destDir, fileName)

    // 如果目标已存在，则加时间戳后缀
    if (await fs.pathExists(targetPath)) {
      const ext = path.extname(fileName)
      const name = path.basename(fileName, ext)
      targetPath = path.join(destDir, `${name}_${Date.now()}${ext}`)
    }

    await fs.move(src, targetPath)
    return targetPath
  }

  /**
   * 将文件移入“待删除”
   */
  public async moveToTrash(filePath: string) {
    return this.moveWithConflictHandling(filePath, this.getTrashPath())
  }

  /**
   * 将文件移入“已编辑”
   */
  public async moveToEdited(filePath: string) {
    return this.moveWithConflictHandling(filePath, this.getEditedPath())
  }

  /**
   * [新增] 将原视频移入“已转码”归档
   */
  public async moveToTranscoded(filePath: string) {
    return this.moveWithConflictHandling(filePath, this.getTranscodedPath())
  }
}

export const storageManager = new StorageManager()
