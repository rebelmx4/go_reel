// src/stores/videoStore.ts

import { create } from 'zustand';

/**
 * 从文件完整路径中提取文件名。
 * @param path - 文件路径 (e.g., "C:\\Users\\Videos\\example.mp4")
 * @returns 文件名 (e.g., "example.mp4")
 */
export const deriveFilename = (path: string): string => {
  return path.replace(/\\/g, '/').split('/').pop() || '';
};

/**
 * @interface VideoFile
 * @description 视频的核心数据模型，在前端状态管理中使用。
 * 这是后端 ScanResult 和 Annotation 数据合并后的理想形态。
 */
export interface VideoFile {
  hash: string;       // 视频哈希 (来自 Annotation key)
  path: string;     // 文件绝对路径 (来自 ScanResult)
  createdAt: number;// 文件创建时间戳 (来自 ScanResult)
  liked: boolean;   // 是否喜欢 (来自 Annotation)
  elite: boolean;   // 是否精品 (来自 Annotation.is_favorite)
  tags: number[];   // 标签ID列表 (来自 Annotation)
}

// 定义派生状态的接口
interface DerivedVideoState {
  newestVideos: VideoFile[];
  likedVideos: VideoFile[];
  eliteVideos: VideoFile[];
}

interface VideoState extends DerivedVideoState {
  videos: VideoFile[];
  isLoading: boolean;
  
  // 动作
  loadVideos: () => Promise<void>;
  toggleLike: (hash: string) => Promise<void>;
  toggleElite: (hash: string) => Promise<void>;
  
  // 选择器 (现在变得更简单)
  getVideoById: (hash: string) => VideoFile | undefined;
  getNewestVideos: () => VideoFile[];
  getLikedVideos: () => VideoFile[];
  getEliteVideos: () => VideoFile[];
}

/**
 * 模拟从主进程获取并合并视频数据。
 * 在真实应用中，这个逻辑可能在主进程完成，前端只需接收最终结果。
 */
async function fetchHybridVideoData(): Promise<VideoFile[]> {
    const startupResult = await window.api.getStartupResult();
    const annotationsList = await window.api.getAllAnnotations();
    const annotations = new Map(annotationsList);

    if (!startupResult || !startupResult.videoList) return [];

    const videoDataList: VideoFile[] = [];

    // ✨ 已根据您的要求修正这里的逻辑
    for (const video of startupResult.videoList) {
        const hash = video.hash;
        const annotation = annotations.get(hash);

        // 无论是否存在 annotation，都将视频加入列表
        // 如果不存在，则提供默认值
        videoDataList.push({
            hash: hash,
            path: video.path,
            createdAt: video.creation_time,
            liked: annotation ? annotation.like_count > 0 : false,
            elite: annotation ? annotation.is_favorite : false,
            tags: annotation ? annotation.tags || [] : [],
        });
    }
    return videoDataList;
}

// 一个集中的函数来计算所有派生状态
const computeDerivedVideoLists = (videos: VideoFile[]): DerivedVideoState => {
  const sortedByDate = [...videos].sort((a, b) => b.createdAt - a.createdAt);

  return {
    newestVideos: sortedByDate.slice(0, 100),
    likedVideos: sortedByDate.filter(v => v.liked),
    eliteVideos: sortedByDate.filter(v => v.elite),
  };
};

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  isLoading: true,
  // 初始化派生状态
  newestVideos: [],
  likedVideos: [],
  eliteVideos: [],

  loadVideos: async () => {
    set({ isLoading: true });
    try {
      const videos = await fetchHybridVideoData();
      // 加载数据后，一次性计算并设置所有派生状态
      set({ videos, ...computeDerivedVideoLists(videos), isLoading: false });
    } catch (error) {
      console.error('加载混合视频数据失败:', error);
      set({ isLoading: false });
    }
  },

  getVideoById: (hash) => get().videos.find(v => v.hash === hash),
  
  toggleLike: async (hash) => {
    const originalVideos = get().videos;
    const video = originalVideos.find(v => v.hash === hash);
    if (!video) return;

    const newLikedState = !video.liked;
    
    // 乐观更新UI
    const updatedVideos = originalVideos.map(v => v.hash === hash ? { ...v, liked: newLikedState } : v);
    // 每当原始 videos 变化时，重新计算派生状态
    set({ videos: updatedVideos, ...computeDerivedVideoLists(updatedVideos) });

    try {
      await window.api.updateAnnotation(hash, { like_count: newLikedState ? 1 : 0 });
    } catch (error) {
      console.error(`更新喜欢状态失败 for ${hash}:`, error);
      // 失败时回滚并重新计算派生状态
      set({ videos: originalVideos, ...computeDerivedVideoLists(originalVideos) });
    }
  },

  toggleElite: async (hash) => {
    const originalVideos = get().videos;
    const video = originalVideos.find(v => v.hash === hash);
    if (!video) return;

    const newEliteState = !video.elite;

    // 乐观更新UI
    const updatedVideos = originalVideos.map(v => v.hash === hash ? { ...v, elite: newEliteState } : v);
    // 每当原始 videos 变化时，重新计算派生状态
    set({ videos: updatedVideos, ...computeDerivedVideoLists(updatedVideos) });
    
    try {
      await window.api.updateAnnotation(hash, { is_favorite: newEliteState });
    } catch (error) {
      console.error(`更新精品状态失败 for ${hash}:`, error);
      // 失败时回滚并重新计算派生状态
      set({ videos: originalVideos, ...computeDerivedVideoLists(originalVideos) });
    }
  },

  // --- 选择器 (现在它们只返回已存储的状态，不会创建新数组) ---
  getNewestVideos: () => get().newestVideos,
  getLikedVideos: () => get().likedVideos,
  getEliteVideos: () => get().eliteVideos,
}));