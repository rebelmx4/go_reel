import { create } from 'zustand';
import { useVideoStore, VideoFile } from './videoStore';

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
   * 如果 videoStore 尚未加载完成，可能返回空或部分数据。
   */
  getHistoryVideos: () => VideoFile[];
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
    // 1. 乐观更新 (Optimistic Update): 立即更新 UI，不需要等待后端
    const { historyPaths } = get();
    // 移除已存在的该路径（去重），放入头部，并截取前 100 个
    const newPaths = [path, ...historyPaths.filter((p) => p !== path)].slice(0, 100);
    
    set({ historyPaths: newPaths });

    // 2. 异步调用后端持久化
    try {
      await window.api.addHistory(path);
    } catch (error) {
      console.error('Failed to add to history:', error);
      // 如果失败，选择重新加载一次真实历史，或者静默失败
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
    // 获取当前的视频仓库数据
    // 注意：这里使用 getState() 获取即时快照
    const allVideos = useVideoStore.getState().videos;

    if (!allVideos || allVideos.length === 0) {
      return [];
    }

    // 将路径映射为视频对象
    // 过滤掉 undefined (即 history 中有记录，但 files.json 中已扫描不到该视频的情况)
    return historyPaths
      .map((path) => allVideos.find((v) => v.path === path))
      .filter((v): v is VideoFile => v !== undefined);
  },
}));