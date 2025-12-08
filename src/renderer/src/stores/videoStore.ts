import { create } from 'zustand';

/**
 * Video file data structure
 */
export interface VideoFile {
  id: number;
  path: string;
  filename: string;
  duration: number;
  size: number;
  createdAt: number;
  lastPlayedAt?: number;
  playCount: number;
  liked: boolean;
  elite: boolean;
  tags: number[];
  thumbnail?: string;
}

interface VideoState {
  videos: VideoFile[];
  isLoading: boolean;
  
  // Actions
  loadVideos: () => Promise<void>;
  getVideoById: (id: number) => VideoFile | undefined;
  toggleLike: (id: number) => void;
  toggleElite: (id: number) => void;
  updateLastPlayed: (id: number) => void;
  
  // Filtered lists
  getRecentVideos: () => VideoFile[];
  getNewestVideos: () => VideoFile[];
  getLikedVideos: () => VideoFile[];
  getEliteVideos: () => VideoFile[];
  searchByFilename: (keyword: string) => VideoFile[];
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  isLoading: false,

  loadVideos: async () => {
    set({ isLoading: true });
    try {
      // TODO: Load from files.json via IPC
      // For now, use mock data
      const mockVideos: VideoFile[] = [
        {
          id: 1,
          path: '/videos/sample1.mp4',
          filename: '富士山日落.mp4',
          duration: 120,
          size: 50000000,
          createdAt: Date.now() - 86400000 * 5,
          lastPlayedAt: Date.now() - 3600000,
          playCount: 10,
          liked: true,
          elite: true,
          tags: [1, 2],
        },
        {
          id: 2,
          path: '/videos/sample2.mp4',
          filename: '海滩风景.mp4',
          duration: 90,
          size: 40000000,
          createdAt: Date.now() - 86400000 * 3,
          lastPlayedAt: Date.now() - 7200000,
          playCount: 5,
          liked: false,
          elite: false,
          tags: [2],
        },
        {
          id: 3,
          path: '/videos/sample3.mp4',
          filename: '人物特写.mp4',
          duration: 60,
          size: 30000000,
          createdAt: Date.now() - 86400000 * 1,
          playCount: 2,
          liked: true,
          elite: false,
          tags: [3, 4],
        },
      ];
      set({ videos: mockVideos, isLoading: false });
    } catch (error) {
      console.error('Failed to load videos:', error);
      set({ isLoading: false });
    }
  },

  getVideoById: (id) => {
    return get().videos.find(v => v.id === id);
  },

  toggleLike: (id) => {
    set(state => ({
      videos: state.videos.map(v =>
        v.id === id ? { ...v, liked: !v.liked } : v
      )
    }));
    // TODO: Save to files.json
  },

  toggleElite: (id) => {
    set(state => ({
      videos: state.videos.map(v =>
        v.id === id ? { ...v, elite: !v.elite } : v
      )
    }));
    // TODO: Save to files.json
  },

  updateLastPlayed: (id) => {
    set(state => ({
      videos: state.videos.map(v =>
        v.id === id
          ? { ...v, lastPlayedAt: Date.now(), playCount: v.playCount + 1 }
          : v
      )
    }));
    // TODO: Save to files.json
  },

  getRecentVideos: () => {
    return get().videos
      .filter(v => v.lastPlayedAt)
      .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
  },

  getNewestVideos: () => {
    return get().videos
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  getLikedVideos: () => {
    return get().videos
      .filter(v => v.liked)
      .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
  },

  getEliteVideos: () => {
    return get().videos
      .filter(v => v.elite)
      .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
  },

  searchByFilename: (keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    return get().videos
      .filter(v => v.filename.toLowerCase().includes(lowerKeyword))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
}));
