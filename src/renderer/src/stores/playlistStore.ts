// src/stores/playlistStore.ts
import { create } from 'zustand';
import { useVideoStore } from './videoStore';

type PlaylistMode = 'all' | 'liked' | 'elite' | 'search';

interface PlaylistState {
  mode: PlaylistMode;
  currentPath: string | null;
  searchQuery: string;

  // Actions
  setMode: (mode: PlaylistMode) => void;
  setCurrentPath: (path: string | null) => void;
  setSearchQuery: (query: string) => void;

  // 核心逻辑：获取当前活跃的播放列表（纯路径数组）
  getCurrentQueue: () => string[];
  
  // 导航
  next: (isRandom?: boolean) => void;
  prev: () => void;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  mode: 'all',
  currentPath: null,
  searchQuery: '',

  setMode: (mode) => set({ mode }),
  setCurrentPath: (path) => set({ currentPath: path }),
  setSearchQuery: (query) => set({ searchQuery: query, mode: 'search' }),

  getCurrentQueue: () => {
    const { mode, searchQuery } = get();
    const videoState = useVideoStore.getState();

    switch (mode) {
      case 'liked':
        return videoState.videoPaths.filter(p => (videoState.videos[p].annotation?.like_count ?? 0) > 0);
      case 'elite':
        return videoState.videoPaths.filter(p => videoState.videos[p].annotation?.is_favorite);
      case 'search':
        return videoState.videoPaths.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
      default:
        return videoState.videoPaths;
    }
  },

  next: (isRandom = false) => {
    const queue = get().getCurrentQueue();
    if (queue.length === 0) return;

    const currentPath = get().currentPath;
    let nextPath: string;

    if (isRandom) {
      nextPath = queue[Math.floor(Math.random() * queue.length)];
    } else {
      const currentIndex = currentPath ? queue.indexOf(currentPath) : -1;
      nextPath = queue[(currentIndex + 1) % queue.length];
    }

    set({ currentPath: nextPath });
  },

  prev: () => {
    const queue = get().getCurrentQueue();
    const currentPath = get().currentPath;
    if (queue.length === 0 || !currentPath) return;

    const currentIndex = queue.indexOf(currentPath);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    set({ currentPath: queue[prevIndex] });
  }
}));