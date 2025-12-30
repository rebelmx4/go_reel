// src/stores/videoStore.ts

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { JoinedVideo, Annotation } from '../../../shared/models';

/**
 * VideoState 定义
 */
interface VideoState {
  // 数据核心：Path -> JoinedVideo 的映射表 (数据库)
  videos: Record<string, JoinedVideo>;
  // 索引列表：存储路径的有序数组 (用于 Grid 渲染和排序)
  videoPaths: string[];
  // 全局加载状态
  isLoading: boolean;

  // --- Actions ---
  /** 初始化：从后端获取物理扫描与注解合并后的结果 */
  initStore: () => Promise<void>;
  
  /** 
   * 更新注解：统一处理点赞、收藏、标签、旋转等
   * @param path 视频绝对路径
   * @param updatesPartial 部分注解更新
   */
  updateAnnotation: (path: string, updates: Partial<Annotation>) => Promise<void>;

  // --- 简易选择器 (用于在组件外或逻辑中快速获取数据) ---
  getVideoByPath: (path: string) => JoinedVideo | undefined;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: {},
  videoPaths: [],
  isLoading: false,

  /**
   * 初始化 Store
   * 启动时调用一次，直接获取后端 StartupService 的计算结果
   */
  initStore: async () => {
    set({ isLoading: true });
    try {
      // 从后端获取 StartupResult
      const result = await window.api.getStartupResult();
      
      if (!result || !result.videoList) {
        set({ videos: {}, videoPaths: [], isLoading: false });
        return;
      }

      const videoMap: Record<string, JoinedVideo> = {};
      const paths: string[] = [];

      // 转换为 Map 结构，并记录路径索引
      result.videoList.forEach((v) => {
        videoMap[v.path] = v;
        paths.push(v.path);
      });

      // 默认排序：可以根据需求在这里对 paths 进行排序，例如按修改时间倒序
      paths.sort((a, b) => videoMap[b].mtime - videoMap[a].mtime);

      set({
        videos: videoMap,
        videoPaths: paths,
        isLoading: false,
      });
    } catch (error) {
      console.error('[VideoStore] Failed to initialize:', error);
      set({ isLoading: false });
    }
  },

  /**
   * 更新注解 (核心业务方法)
   * 采用乐观更新策略：先改 UI，再发请求，失败则回滚
   */
  updateAnnotation: async (path: string, updates: Partial<Annotation>) => {
    const originalVideo = get().videos[path];
    if (!originalVideo) return;

    // 1. 准备旧注解，用于可能的失败回滚
    const oldAnnotation = originalVideo.annotation;

    // 2. 构造新注解对象
    const newAnnotation: Annotation = {
      // 默认初始值
      like_count: 0,
      is_favorite: false,
      rotation: 0,
      screenshot_rotation: null,
      tags: [],
      // 合并旧值与新更新
      ...oldAnnotation,
      ...updates
    };

    // 3. 乐观更新 UI (立即生效)
    set((state) => ({
      videos: {
        ...state.videos,
        [path]: {
          ...originalVideo,
          annotation: newAnnotation
        }
      }
    }));

    try {
      // 4. 调用后端 IPC (使用路径，后端内部通过 withHash 处理哈希)
      const res = await window.api.updateAnnotation(path, updates);
      if (!res.success) throw new Error(res.error);
    } catch (error) {
      console.error(`[VideoStore] Update annotation failed for ${path}:`, error);
      
      // 5. 失败回滚到旧状态
      set((state) => ({
        videos: {
          ...state.videos,
          [path]: {
            ...originalVideo,
            annotation: oldAnnotation
          }
        }
      }));
    }
  },

  // 获取单个视频的工具方法
  getVideoByPath: (path) => get().videos[path],
}));

/**
 * --- 导出一些常用的选择器 (Selectors) ---
 * 使用这些选择器可以避免组件在不相关数据变化时重渲染
 */

// 获取当前显示的路径列表
export const useVideoPaths = () => useVideoStore((s) => s.videoPaths);

// 获取特定的视频对象 (通过路径)
export const useVideoItem = (path: string) => useVideoStore((s) => s.videos[path]);

// 获取点赞列表路径
export const useLikedPaths = () => {
  return useVideoStore(
    useShallow((s) => 
      s.videoPaths.filter(path => (s.videos[path].annotation?.like_count ?? 0) > 0)
    )
  );
};

// 获取精品列表路径
export const useElitePaths = () => {
  return useVideoStore(
    useShallow((s) => 
      s.videoPaths.filter(path => s.videos[path].annotation?.is_favorite)
    )
  );
};

/**
 * 获取最新视频路径列表（前100个）
 */
export const useNewestPaths = () => {
  return useVideoStore(
    useShallow((s) => s.videoPaths.slice(0, 100))
  );
};

