import path from 'path'
import fs from 'fs-extra'
import log from 'electron-log'
import { ipcMain } from 'electron'
import { screenshotManager } from '../data'
import { coverManager } from '../data/assets/CoverManager'
import { storageManager, annotationManager, fileProfileManager } from '../data'
import { VideoMetadataUtils } from '../utils'
import { calculateFastHash } from '../utils'

export interface ExportRange {
  start: number
  end: number
}

export class VideoExportService {
  /**
   * 核心导出方法
   * @param sourcePath 视频绝对路径
   * @param logicRanges 用户选择的保留片段
   */
  public async exportVideo(sourcePath: string, logicRanges: ExportRange[]) {
    // 1. 获取原视频信息（通过路径获取，用于确定临时目录名）
    const oldProfile = await fileProfileManager.getProfile(sourcePath)
    if (!oldProfile) throw new Error('无法定位视频档案')

    // 2. 创建基于隔离工作空间（临时目录）
    const tempDir = path.join(storageManager.getCropWorkRoot(), oldProfile.hash)
    await fs.ensureDir(tempDir)

    const keyframes = await VideoMetadataUtils.getKeyframes(sourcePath)
    const pRanges = logicRanges.map((r) =>
      VideoMetadataUtils.getPhysicalRange(keyframes, r.start, r.end)
    )

    const tempFiles: string[] = []
    const fileListPath = path.join(tempDir, `concat_list.txt`)
    const finalTempOutput = path.join(tempDir, path.basename(sourcePath))

    try {
      // 3. 提取物理片段
      for (let i = 0; i < pRanges.length; i++) {
        const range = pRanges[i]
        const tempOut = path.join(tempDir, `seg_${i}.mp4`)
        await VideoMetadataUtils.extractSegment(
          sourcePath,
          range.pStart,
          range.pEnd - range.pStart,
          tempOut
        )
        tempFiles.push(tempOut)
      }

      // 4. 合并片段
      const listContent = tempFiles
        .map((f) => `file '${path.resolve(f).replace(/\\/g, '/')}'`)
        .join('\n')
      await fs.writeFile(fileListPath, listContent)
      await VideoMetadataUtils.concatFiles(fileListPath, finalTempOutput)

      // 5. 资产迁移 (通过原路径和生成的临时文件路径进行)
      await this.migrateAssets(sourcePath, finalTempOutput, pRanges)

      // 6. 备份旧逻辑数据 (此时 sourcePath 还是旧视频)
      const oldAnnotation = await annotationManager.getAnnotation(sourcePath)

      // 7. 物理文件交换
      // 将原视频移入“已编辑”目录
      await storageManager.moveToEdited(sourcePath)
      // 将新视频从临时目录移回原位置
      await fs.move(finalTempOutput, sourcePath)

      // 8. 更新逻辑数据
      if (oldAnnotation) {
        // 由于 sourcePath 的文件已换，updateAnnotation 内部通过 fileProfileManager 获取时会得到新 Hash
        // 从而实现将旧的 Annotation 数据（标签、收藏等）写入到新 Hash 的记录中
        await annotationManager.updateAnnotation(sourcePath, oldAnnotation)
      }

      // 9. 强制刷新档案 (让 FileProfileManager 记录新文件的 Hash、大小等)
      await fileProfileManager.getProfile(sourcePath)

      log.info(`[Export] 裁剪合并成功: ${sourcePath}`)
    } catch (error) {
      log.error(`[Export] 导出失败:`, error)
      throw error
    } finally {
      // 10. 清理临时目录
      await fs.remove(tempDir).catch(() => {})
    }
  }

  /**
   * 资产迁移：封面复制，截图过滤并重命名
   * @param oldPath 原视频路径
   * @param newTempPath 刚生成的临时视频路径
   * @param pRanges 物理切割范围
   */
  private async migrateAssets(oldPath: string, newTempPath: string, pRanges: any[]) {
    // 1. 封面迁移：Manager 内部根据路径处理
    // 假设 coverManager 已经支持通过路径或其内部维护的 Hash 逻辑
    const oldCover = await coverManager.getCover(oldPath) // 这会返回 file:// 协议路径
    const oldCoverPath = oldCover.replace('file://', '')

    // 计算新视频的临时 Hash 用以确定新封面存储位置
    const newHash = await calculateFastHash(newTempPath)
    // 这里我们直接利用 Manager 的内部方法拼出新封面路径 (绕过对外部暴露 Hash 逻辑)
    const newCoverPath = coverManager['getCoverPath'](newHash)

    if (await fs.pathExists(oldCoverPath)) {
      await fs.ensureDir(path.dirname(newCoverPath))
      await fs.copy(oldCoverPath, newCoverPath)
    }

    // 2. 截图迁移
    const oldScreenshots = await screenshotManager.loadScreenshots(oldPath)
    const oldProfile = await fileProfileManager.getProfile(oldPath)
    const oldHash = oldProfile!.hash

    let cumulativeOffsetMs = 0

    for (const range of pRanges) {
      const pStartMs = range.pStart * 1000
      const pEndMs = range.pEnd * 1000

      // 过滤：仅保留落在当前物理保留片段内的截图
      const inRange = oldScreenshots.filter((s) => s.timestamp >= pStartMs && s.timestamp <= pEndMs)

      for (const s of inRange) {
        // 时间轴平移计算
        const newTimestamp = s.timestamp - pStartMs + cumulativeOffsetMs
        const newFilename = `${Math.floor(newTimestamp).toString().padStart(8, '0')}.webp`

        // 物理搬运
        const src = screenshotManager['getFilePathInHash'](oldHash, s.filename)
        const dest = screenshotManager['getFilePathInHash'](newHash, newFilename)

        await fs.ensureDir(path.dirname(dest))
        await fs.copy(src, dest)
      }
      cumulativeOffsetMs += pEndMs - pStartMs
    }
  }
}

// 导出单例实例
export const videoExportService = new VideoExportService()

/**
 * 注册 IPC 处理程序
 */
export function registerVideoExportHandlers() {
  ipcMain.handle('video-export:execute', async (_, { sourcePath, ranges }) => {
    try {
      // 使用导出的实例调用方法
      return await videoExportService.exportVideo(sourcePath, ranges)
    } catch (err: any) {
      log.error('[IPC] video-export:execute failed:', err)
      return { success: false, error: err.message }
    }
  })
}
