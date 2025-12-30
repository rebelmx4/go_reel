// src/stores/historyStore.ts
import { create } from 'zustand';
import { useVideoStore } from './videoStore';
import { JoinedVideo } from '../../../shared/models'; // 确保路径指向 shared/models

interface HistoryState {
  historyPaths: string[];
  isLoading: boolean;

  // --- Actions ---
  loadHistory: () => Promise<void>;
  addToHistory: (path: string) => Promise<void>;
  removeFromHistory: (path: string) => Promise<void>;
  clearHistory: () => Promise<void>;

  // --- Selectors / Helpers ---
  /**
   * 获取完整的历史视频对象列表。
   * 注意：此方法依赖 videoStore 中的数据。
   */
  getHistoryVideos: () => JoinedVideo[];
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  historyPaths: [],
  isLoading: false,

  loadHistory: async () => {
    set({ isLoading: true });
    try {
      // 从后端获取经过校验的路径列表
      const paths = await window.api.getHistory();
      set({ historyPaths: paths });
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addToHistory: async (path: string) => {
    // 1. 乐观更新 (Optimistic Update)
    const { historyPaths } = get();
    const newPaths = [path, ...historyPaths.filter((p) => p !== path)].slice(0, 100);
    
    set({ historyPaths: newPaths });

    // 2. 异步调用后端持久化
    try {
      await window.api.addHistory(path);
    } catch (error) {
      console.error('Failed to add to history:', error);
      get().loadHistory();
    }
  },

  removeFromHistory: async (path: string) => {
    // 1. 乐观更新
    const { historyPaths } = get();
    set({ historyPaths: historyPaths.filter((p) => p !== path) });

    // 2. 后端同步
    try {
      await window.api.removeFromHistory(path);
    } catch (error) {
      console.error('Failed to remove from history:', error);
      get().loadHistory();
    }
  },

  clearHistory: async () => {
    set({ historyPaths: [] });
    try {
      await window.api.clearHistory();
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  },

  getHistoryVideos: () => {
    const { historyPaths } = get();
    // 获取当前的视频仓库数据 (Record<string, JoinedVideo>)
    const videoMap = useVideoStore.getState().videos;

    if (!videoMap || Object.keys(videoMap).length === 0) {
      return [];
    }

    // 将路径映射为视频对象
    // 由于 videoMap 是 Record，直接通过 path 索引即可
    return historyPaths
      .map((path) => videoMap[path])
      .filter((v): v is JoinedVideo => v !== undefined);
  },
}));