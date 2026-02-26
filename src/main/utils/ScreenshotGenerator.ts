import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import koffi from 'koffi'
import type { VideoMetadata } from '../../shared/models'

// ==========================================
// 1. DLL 路径查找与加载 (核心修复)
// ==========================================

function resolveDllPath(dllName: string): string {
  // 1. 生产环境: resources/bin (electron-builder 打包结构)
  const prodPath = path.join(process.resourcesPath, 'bin', dllName)

  // 2. 开发环境: 项目根目录/bin
  // app.getAppPath() 在开发时指向项目根目录 (dist/main 的上一级或 src)
  const devPath = path.join(app.getAppPath(), 'bin', dllName)

  // 3. 调试兜底: 有时在 out/main 下，需要向上找
  const debugPath = path.join(app.getAppPath(), '../bin', dllName)

  if (fs.existsSync(prodPath)) return prodPath
  if (fs.existsSync(devPath)) return devPath
  if (fs.existsSync(debugPath)) return debugPath

  console.warn(`[ScreenshotGenerator] DLL not found in common paths. Trying default: ${devPath}`)
  return devPath
}

const DLL_NAME = 'ffmpeg_extensions.dll'
const DLL_PATH = resolveDllPath(DLL_NAME)

console.log(DLL_PATH)

let lib: any
try {
  lib = koffi.load(DLL_PATH)
} catch (error) {
  console.error('[ScreenshotGenerator] Failed to load DLL.', error)
  throw error
}

const VideoInfoResult = koffi.struct('VideoInfoResult', {
  duration_ms: 'int64',
  width: 'int',
  height: 'int',
  framerate: 'double',
  success: 'int'
})

// ==========================================
// 2. Koffi 函数绑定
// ==========================================

const funcGetVideoDuration = lib.func('longlong get_video_duration(str video_path)')
const funcGenerateScreenshot = lib.func(
  'int generate_screenshot(str video_path, longlong timestamp_ms, str output_path)'
)
const funcGeneratePercent = lib.func(
  'int generate_screenshot_at_percentage(str video_path, double percentage, str output_path)'
)
const funcGenerateBatch = lib.func(
  'int generate_screenshots_for_video(str video_path, longlong* timestamps_ms, int count, str output_path_template)'
)
const funcGenerateMultiVideos = lib.func(
  'int generate_screenshots_for_videos(str* video_paths, int count, longlong timestamp_ms, str output_dir)'
)
const funcGetVideoMetadata = lib.func('VideoInfoResult get_video_metadata(str video_path)')

// ==========================================
// 3. 业务类定义
// ==========================================

export interface ScreenshotOptions {
  outputDir: string
  filenamePrefix?: string
  // [新增] 允许传入自定义文件名模式，例如 "%ms_a"
  // 如果不传，则默认使用 prefix_%ms
  filenamePattern?: string
  format?: 'webp' | 'png' | 'jpg'
}

export class ScreenshotGenerator {
  public static async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      funcGetVideoDuration.async(videoPath, (err: any, res: number) => {
        if (err) return reject(err)
        if (res < 0) return reject(new Error('Failed to get video duration via C++.'))
        resolve(res / 1000.0)
      })
    })
  }

  // [新增] 获取完整元数据
  public static async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      // Koffi 的 async 调用会自动在 worker 线程执行，不阻塞 UI
      funcGetVideoMetadata.async(videoPath, (err: any, res: any) => {
        if (err) {
          console.error('C++ Error:', err)
          // 出错时返回默认安全值
          return resolve({ duration: 0, width: 0, height: 0, framerate: 0 })
        }

        // res 是 Koffi 解析后的 JS 对象
        if (res.success === 1) {
          resolve({
            // C++ 返回的是 ms (long long -> BigInt/Number)，除以 1000 转为秒
            // Koffi 默认处理 int64 可能为 BigInt，这里转 Number 比较安全
            duration: Number(res.duration_ms) / 1000,
            width: res.width,
            height: res.height,
            framerate: res.framerate
          })
        } else {
          // C++ 内部打开失败
          resolve({ duration: 0, width: 0, height: 0, framerate: 0 })
        }
      })
    })
  }

  /**
   * [修改] 现在支持直接传入完整的 outputPath，不再强制只能传 outputDir
   * 如果传入的是目录，则自动生成文件名；如果传入的是文件路径，则直接使用。
   */
  public static async generateScreenshotAtTimestamp(
    videoPath: string,
    timestampInSeconds: number,
    targetPathOrDir: string // 参数名改了，逻辑更灵活
  ): Promise<string> {
    let outputPath = targetPathOrDir

    // 简单判断：如果并没有以 .webp/.png/.jpg 结尾，就当作是目录
    if (!outputPath.match(/\.(webp|png|jpg)$/i)) {
      await fs.promises.mkdir(outputPath, { recursive: true })
      const filename = `${Math.floor(timestampInSeconds * 1000)}.webp`
      outputPath = path.join(outputPath, filename)
    } else {
      // 如果是文件路径，确保其父目录存在
      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
    }

    const timestampMs = Math.floor(timestampInSeconds * 1000)

    return new Promise((resolve, reject) => {
      funcGenerateScreenshot.async(videoPath, timestampMs, outputPath, (err: any, res: number) => {
        if (err) return reject(err)
        if (res === 0) resolve(outputPath)
        else reject(new Error(`C++ failed with code ${res}`))
      })
    })
  }

  public static async generateScreenshotAtPercentage(
    videoPath: string,
    percentage: number,
    options: ScreenshotOptions
  ): Promise<string | null> {
    if (percentage < 0 || percentage > 100) return null

    try {
      // [修复点] 使用 fs.promises.mkdir
      await fs.promises.mkdir(options.outputDir, { recursive: true })

      const format = options.format || 'webp'
      const prefix = options.filenamePrefix || 'capture'
      const filename = `${prefix}_${Math.floor(percentage)}percent.${format}`
      const outputPath = path.join(options.outputDir, filename)

      return new Promise((resolve) => {
        funcGeneratePercent.async(videoPath, percentage, outputPath, (err: any, res: number) => {
          if (err || res !== 0) resolve(null)
          else resolve(outputPath)
        })
      })
    } catch (e) {
      return null
    }
  }

  public static async generateMultipleScreenshots(
    videoPath: string,
    timestamps: number[],
    options: ScreenshotOptions
  ): Promise<string[]> {
    if (!timestamps || timestamps.length === 0) return []

    await fs.promises.mkdir(options.outputDir, { recursive: true })

    const timestampsMs = timestamps.map((t) => Math.floor(t * 1000))
    const format = options.format || 'webp'

    // [逻辑修改] 构建模板
    // 如果用户传了 filenamePattern (例如 "%ms_a")，就用用户的
    // 否则使用旧逻辑：prefix + "%ms"
    let filenameTemplateStr = ''
    if (options.filenamePattern) {
      filenameTemplateStr = `${options.filenamePattern}.${format}`
    } else {
      const prefix = options.filenamePrefix ? options.filenamePrefix + '_' : ''
      filenameTemplateStr = `${prefix}%ms.${format}`
    }

    const fullPathTemplate = path.join(options.outputDir, filenameTemplateStr)

    return new Promise((resolve, reject) => {
      funcGenerateBatch.async(
        videoPath,
        timestampsMs,
        timestampsMs.length,
        fullPathTemplate,
        (err: any, successCount: number) => {
          if (err) return reject(err)
          const resultPaths: string[] = []
          if (successCount > 0) {
            // 根据模板反向生成文件名列表，供前端使用
            timestampsMs.forEach((ts) => {
              const finalName = filenameTemplateStr.replace('%ms', ts.toString())
              resultPaths.push(path.join(options.outputDir, finalName))
            })
          }
          resolve(resultPaths)
        }
      )
    })
  }
}
