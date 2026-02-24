// src/stores/videoFileRegistryStore.ts

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { VideoFile, Annotation, DEFAULT_ANNOTATION } from '../../../shared'

/**
 * Registry 状态定义
 */
interface VideoFileRegistryState {
  // 数据仓库：Path -> VideoFile 的映射表
  videos: Record<string, VideoFile>
  // 基础索引：所有视频路径的有序数组
  videoPaths: string[]
  // 加载状态
  isLoading: boolean

  // --- Actions ---

  /**
   * 初始化数据：由 main.tsx 中的 bootstrap 调用
   * 直接接收后端扫描好的结果
   */
  setInitialData: (videoList: VideoFile[]) => void

  /**
   * 更新档案注解：处理点赞、收藏、标签、旋转等
   * 采用“乐观更新”策略：先改 UI，再发 IPC，失败则回滚
   */
  updateAnnotation: (path: string, updates: Partial<Annotation>) => Promise<void>
  batchUpdateAnnotation: (paths: string[], addedTags: number[]) => void

  /** 辅助方法：非 Hook 环境下获取单个文件 */
  getVideoByPath: (path: string) => VideoFile | undefined

  removeVideo: (path: string) => void

  refreshCover: (path: string) => void
  bumpVideoVersion: (path: string) => void
}

export const useVideoFileRegistryStore = create<VideoFileRegistryState>((set, get) => ({
  videos: {},
  videoPaths: [],
  isLoading: true,

  setInitialData: (videoList) => {
    const videoMap: Record<string, VideoFile> = {}
    const paths: string[] = []

    videoList.forEach((v) => {
      videoMap[v.path] = v
      paths.push(v.path)
    })

    // 默认排序：按修改时间倒序
    paths.sort((a, b) => videoMap[b].mtime - videoMap[a].mtime)

    set({
      videos: videoMap,
      videoPaths: paths,
      isLoading: false
    })
  },

  updateAnnotation: async (path, updates) => {
    const originalFile = get().videos[path]
    if (!originalFile) return

    // 1. 获取旧注解（可能是 undefined）
    const oldAnnotation = originalFile.annotation

    // 3. 构造新注解
    // 优先级：默认值 < 旧值 < 新更新
    const newAnnotation: Annotation = {
      ...DEFAULT_ANNOTATION,
      ...(oldAnnotation ?? {}), // 如果是 undefined，就解构空对象
      ...updates
    }

    // 4. 乐观更新
    set((state) => ({
      videos: {
        ...state.videos,
        [path]: { ...originalFile, annotation: newAnnotation }
      }
    }))

    try {
      const res = await window.api.updateAnnotation(path, updates)
      if (!res.success) throw new Error(res.error)
    } catch (error) {
      // 5. 失败回滚：如果以前是 undefined，这里会回滚回 undefined，完全符合你的要求
      set((state) => ({
        videos: {
          ...state.videos,
          [path]: { ...originalFile, annotation: oldAnnotation }
        }
      }))
    }
  },

  bumpVideoVersion: (path: string) => {
    set((state) => {
      const video = state.videos[path]
      if (!video) return state

      if (video.version) return state
      return {
        videos: {
          ...state.videos,
          [path]: { ...video, version: (video.version || 0) + 1 }
        }
      }
    })
  },

  batchUpdateAnnotation: (paths, addedTags) => {
    set((state) => {
      const newVideos = { ...state.videos }

      paths.forEach((path) => {
        const originalFile = newVideos[path]
        if (originalFile) {
          const oldTags = originalFile.annotation?.tags || []
          // 合并并去重
          const mergedTags = Array.from(new Set([...oldTags, ...addedTags]))

          newVideos[path] = {
            ...originalFile,
            annotation: {
              ...DEFAULT_ANNOTATION,
              ...(originalFile.annotation || {}),
              tags: mergedTags
            }
          }
        }
      })

      return { videos: newVideos }
    })
  },

  getVideoByPath: (path) => get().videos[path],

  removeVideo: (path) => {
    set((state) => {
      const newVideos = { ...state.videos }
      delete newVideos[path]
      const newPaths = state.videoPaths.filter((p) => p !== path)

      return {
        videos: newVideos,
        videoPaths: newPaths
      }
    })
  },

  refreshCover: (path) => {
    set((state) => {
      const video = state.videos[path]
      if (!video) return state

      return {
        videos: {
          ...state.videos,
          [path]: {
            ...video,
            // 改变这个值会触发 React 对该 VideoFile 的响应式重绘
            coverVersion: Date.now()
          }
        }
      }
    })
  }
}))

/**
 * =================================================================
 * --- 选择器 (Selectors) ---
 * =================================================================
 */

// --- A. 纯函数逻辑 (供 Store 内部或其他 Store 使用，例如 PlaylistStore) ---

/** 获取点赞路径列表 */
export const selectLikedPaths = (s: VideoFileRegistryState) =>
  s.videoPaths.filter((p) => (s.videos[p].annotation?.like_count ?? 0) > 0)

/** 获取精品(收藏)路径列表 */
export const selectElitePaths = (s: VideoFileRegistryState) =>
  s.videoPaths.filter((p) => s.videos[p].annotation?.is_favorite)

/** 获取最新视频路径列表 */
export const selectNewestPaths = (s: VideoFileRegistryState) => s.videoPaths.slice(0, 100)

/** 搜索路径列表 */
export const selectSearchPaths = (s: VideoFileRegistryState, query: string) => {
  const q = query.toLowerCase()
  return s.videoPaths.filter((p) => p.toLowerCase().includes(q))
}

// --- B. React Hooks (供 UI 组件使用) ---

/**
 * 获取精品文件对象列表 (用于 Grid 渲染)
 */
export const useEliteFiles = () => {
  return useVideoFileRegistryStore(useShallow((s) => selectElitePaths(s).map((p) => s.videos[p])))
}

/**
 * 获取点赞路径列表 (用于简单的列表展示)
 */
export const useLikedPaths = () => {
  return useVideoFileRegistryStore(useShallow(selectLikedPaths))
}

/**
 * 获取最新文件对象列表
 */
export const useNewestFiles = () => {
  return useVideoFileRegistryStore(useShallow((s) => selectNewestPaths(s).map((p) => s.videos[p])))
}

/**
 * 获取特定视频文件的完整档案 (播放器/详情页专用)
 * 只有当该文件的 annotation 改变时才会触发重绘
 */
export const useVideoFileItem = (path: string | null) => {
  return useVideoFileRegistryStore((s) => (path ? s.videos[path] : null))
}
