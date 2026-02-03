// src/stores/playlistStore.ts

import { create } from 'zustand';
import { 
  useVideoFileRegistryStore, 
  selectLikedPaths, 
  selectElitePaths, 
  selectSearchPaths 
} from './videoFileRegistryStore';

import { 
  usePlayerStore, 
} from './playerStore';
import { useClipStore } from './clipStore';


export type PlaylistMode = 'all' | 'liked' | 'elite' | 'newest' | 'search' | 'tag_filter';

export interface ScoreSegment {
  min: number;
  max: number;
}

interface PlaylistState {
  // --- 状态 ---
  currentPath: string | null;
  mode: PlaylistMode;
  historyPaths: string[]; // 历史足迹存储在此
  searchQuery: string;
  historyIndex: number; 
  filterTagId: number | null; // 新增：记录当前过滤的标签 ID

  // --- 基础 Actions ---
  setMode: (mode: PlaylistMode) => void;
  setSearchQuery: (query: string) => void;
  setHistoryPaths: (paths: string[]) => void; // 供 bootstrap 初始化
  
  /** 
   * 跳转播放 (核心方法)
   * @param path 目标路径
   * @param targetMode 切换到的模式 (例如从历史进入时传 'all')
   */
  jumpTo: (path: string, targetMode?: PlaylistMode, tagId?: number, segment?: ScoreSegment | null) => void;

  /** 直接设置当前路径（会自动触发历史记录更新） */
  setCurrentPath: (path: string | null) => void;

  // --- 导航 Actions ---
  next: () => void;
  prev: () => void;

  // --- 内部辅助方法 (私有) ---
  _internalUpdateHistory: (path: string) => void;

  currentSegment: ScoreSegment | null;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  currentPath: null,
  mode: 'all',
  historyPaths: [],
  searchQuery: '',
  historyIndex: 0,
  filterTagId: null,
  currentSegment: null,

  // --- 基础设置 ---
  setMode: (mode) => set({ mode }),
  
  setSearchQuery: (query) => set({ 
    searchQuery: query, 
    mode: 'search' // 搜索时自动切换到搜索模式
  }),

  setHistoryPaths: (paths) => set({ historyPaths: paths }),

  setCurrentPath: (path) => {
    if (!path) {
      set({ currentPath: null });
      return;
    }
    set({ currentPath: path });
    get()._internalUpdateHistory(path);
  },

  /**
   * 响应你的需求：从历史/列表跳转
   * 自动处理：切换视频 + 切换播放模式 + 记录历史
   */
 jumpTo: (path, targetMode, tagId, segment) => {
  usePlayerStore.getState().setShowClipTrack(false);
        useClipStore.getState().clearClips();
    set((state) => ({
      currentPath: path,
      mode: targetMode ?? state.mode,
      filterTagId: tagId ?? null, // 记录标签 ID
      currentSegment: segment ?? null, 
      historyIndex: 0 
    }));
    get()._internalUpdateHistory(path);
  },


  // --- 导航逻辑 ---

  next:  async () => {
    const { mode, currentPath, searchQuery, filterTagId, currentSegment} = get();
     const player = usePlayerStore.getState();
     const registry = useVideoFileRegistryStore.getState();

    if (currentPath) {
        const video = registry.videos[currentPath];
        const score = video?.annotation?.like_count ?? 0;
        // 如果没交互过 且 分数 > 1
        if (!player.isInteractedInSession && score > 1) {
            // 从设置里读取衰减率，假设默认 0.2
            const decayRate = 0.2; 
            const newScore = Math.max(1, score - decayRate);
            await registry.updateAnnotation(currentPath, { like_count: newScore });
        }
    }

    let queue: string[] = [];
    switch (mode) {
      case 'liked':
        // 如果有分段过滤，则只在分段内找；否则找所有有分的
        queue = registry.videoPaths.filter(p => {
            const s = registry.videos[p].annotation?.like_count ?? 0;
            if (currentSegment) {
                return s >= currentSegment.min && s <= currentSegment.max;
            }
            return s !== 0;
        });
        // 点赞模式按分数降序排，分数相同按 mtime
        queue.sort((a, b) => {
            const scoreA = registry.videos[a].annotation?.like_count ?? 0;
            const scoreB = registry.videos[b].annotation?.like_count ?? 0;
            return scoreB - scoreA || registry.videos[b].mtime - registry.videos[a].mtime;
        });
        break;
      case 'elite': queue = selectElitePaths(registry); break;
      case 'search': queue = selectSearchPaths(registry, searchQuery); break;
      case 'tag_filter': 
        // 核心逻辑：从所有视频中筛选包含该标签的路径
        // 因为 registry.videoPaths 已经按 mtime 排序，所以结果自然也是倒序
        queue = registry.videoPaths.filter(p => 
          registry.videos[p].annotation?.tags?.includes(filterTagId!)
        );
        break;
      default: queue = registry.videoPaths;
    }

    if (queue.length === 0) return;

    usePlayerStore.getState().setShowClipTrack(false);
    useClipStore.getState().clearClips();


    let nextPath: string;
    if (mode === 'all') {
      nextPath = queue[Math.floor(Math.random() * queue.length)];
    } else {
      const currentIndex = currentPath ? queue.indexOf(currentPath) : -1;
      const nextIndex = (currentIndex + 1) % queue.length;
      nextPath = queue[nextIndex];
    }

      
    // 产生新片，更新历史并重置索引
    set({ currentPath: nextPath, historyIndex: 0 });
    get()._internalUpdateHistory(nextPath);
  },

   prev: () => {
    const { historyIndex, historyPaths } = get();
    
    // 如果后面还有历史记录
    if (historyIndex < historyPaths.length - 1) {
        usePlayerStore.getState().setShowClipTrack(false);
        useClipStore.getState().clearClips();

        const newIndex = historyIndex + 1;
        const targetPath = historyPaths[newIndex];
        
        // 注意：这里只更新路径和索引，不触发 _internalUpdateHistory (不重排)
        set({ 
            historyIndex: newIndex, 
            currentPath: targetPath 
        });
    }
  },


  /**
   * 内部私有方法：处理历史记录更新
   * 包含：UI 乐观更新 + 后端 IPC 持久化
   */
  _internalUpdateHistory: (path: string) => {
    const { historyPaths } = get();
    
    // 1. 构造新数组：去重并置顶
    const newHistory = [
      path, 
      ...historyPaths.filter(p => p !== path)
    ].slice(0, 100); // 只保留最近100条

    // 2. 更新本地状态
    set({ historyPaths: newHistory });

    // 3. 异步通知后端持久化
    window.api.addHistory(path).catch(err => {
      console.error('[Playlist] Failed to sync history to backend:', err);
    });
  }
}));

/**
 * --- 选择器 ---
 */

/** 获取当前的播放模式 */
export const usePlaylistMode = () => usePlaylistStore(s => s.mode);

/** 获取当前的搜索词 */
export const useSearchQuery = () => usePlaylistStore(s => s.searchQuery);

/** 获取历史路径列表 (供历史页面渲染使用) */
export const useHistoryPaths = () => usePlaylistStore(s => s.historyPaths);

/** 获取当前播放的路径 */
export const useCurrentPath = () => usePlaylistStore(s => s.currentPath);