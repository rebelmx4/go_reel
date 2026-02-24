// src/stores/screenshotStore.ts

import { create } from 'zustand'

export interface ScreenshotMeta {
  storyboard: boolean
  navigation: boolean
  export: boolean
}

export interface Screenshot {
  filename: string
  timestamp: number
  path: string
  meta?: ScreenshotMeta // 新增属性
}

// 在 api 对象中添加
interface ScreenshotState {
  screenshots: Screenshot[]
  isLoading: boolean
  currentPath: string | null
  isCropMode: boolean
  storyboardUrl: string | null
  // --- Actions ---
  /** 加载截图：如果后端正在生成，它会处理重试逻辑 */
  loadScreenshots: (path: string, retryCount?: number) => Promise<void>

  /** 手动截图 */
  captureManual: (path: string, timestampSeconds: number) => Promise<boolean>

  /** 删除截图 */
  deleteScreenshot: (path: string, filename: string) => Promise<void>

  /** 设置封面 */
  setAsCover: (path: string, screenshotPath: string) => Promise<boolean>

  clear: () => void

  setCropMode: (enabled: boolean) => void

  // --- Actions ---
  loadScreenshotData: (path: string) => Promise<void>
  updateScreenshotMeta: (path: string, updates: Record<string, ScreenshotMeta>) => Promise<void>
  deleteBatch: (path: string, filenames: string[]) => Promise<void>
}

export const useScreenshotStore = create<ScreenshotState>((set, get) => ({
  screenshots: [],
  isLoading: false,
  currentPath: null,
  isCropMode: false,
  storyboardUrl: null,

  // 统一加载逻辑：不再区分 loadScreenshots 和 loadScreenshotData
  loadScreenshots: async (path: string) => {
    // 只有当路径真正改变时才重置并加载
    // 移除 .length > 0 的判断，确保每次切换路径都能触发完整的 Meta 加载
    if (get().currentPath === path && get().screenshots.length > 0) return

    set({ isLoading: true, currentPath: path, screenshots: [], storyboardUrl: null })

    try {
      const [files, meta, collage] = await Promise.all([
        window.api.loadScreenshots(path),
        window.api.getScreenshotMetadata(path),
        window.api.getStoryboardCollage(path)
      ])

      const merged = files.map((f) => ({
        ...f,
        meta: meta[f.filename] || { storyboard: true, navigation: true, export: true }
      }))

      // 确保请求回来时，用户没有切换到另一个视频
      if (get().currentPath === path) {
        set({
          screenshots: merged,
          storyboardUrl: collage,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('加载截图失败:', error)
      set({ isLoading: false })
    }
  },

  // 让此函数直接指向主加载函数
  loadScreenshotData: (path: string) => get().loadScreenshots(path),

  captureManual: async (path, timestamp) => {
    const success = await window.api.saveManualScreenshot(path, timestamp)
    if (success) {
      // 截图后刷新列表，保持 Meta 同步
      const [files, meta, collage] = await Promise.all([
        window.api.loadScreenshots(path),
        window.api.getScreenshotMetadata(path),
        window.api.getStoryboardCollage(path)
      ])
      const merged = files.map((f) => ({
        ...f,
        meta: meta[f.filename] || { storyboard: true, navigation: true, export: true }
      }))
      set({ screenshots: merged, storyboardUrl: collage })
    }
    return success
  },

  setCropMode: (enabled) => set({ isCropMode: enabled }),

  deleteScreenshot: async (path, filename) => {
    await window.api.deleteScreenshot(path, filename)
    set((state) => ({
      screenshots: state.screenshots.filter((s) => s.filename !== filename)
    }))
  },

  setAsCover: async (path, screenshotPath) => {
    return await window.api.setManualCover(path, screenshotPath)
  },

  updateScreenshotMeta: async (path, updates) => {
    const { screenshots } = get()
    // 1. 更新本地状态
    const newScreenshots = screenshots.map((s) => {
      if (updates[s.filename]) {
        return { ...s, meta: updates[s.filename] }
      }
      return s
    })
    set({ screenshots: newScreenshots })

    // 2. 构造完整的 Metadata 对象发送给后端
    const fullMeta: Record<string, ScreenshotMeta> = {}
    newScreenshots.forEach((s) => {
      if (s.meta) fullMeta[s.filename] = s.meta
    })
    await window.api.saveScreenshotMetadata(path, fullMeta)
  },

  deleteBatch: async (path, filenames) => {
    // 循环调用删除
    await Promise.all(filenames.map((f) => window.api.deleteScreenshot(path, f)))
    // 更新本地状态
    set((state) => ({
      screenshots: state.screenshots.filter((s) => !filenames.includes(s.filename))
    }))
  },

  clear: () => set({ screenshots: [], currentPath: null, isLoading: false })
}))
