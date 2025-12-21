import { create } from 'zustand';
import { VideoFile } from './videoStore';

export type PlaylistMode = 'newest' | 'liked' | 'elite' | 'tag-search' | 'random';

interface PlaylistState {
  mode: PlaylistMode;
  currentVideoId: string | null;
  playlist: VideoFile[];
  
  // Actions
  setMode: (mode: PlaylistMode) => void;
  setPlaylist: (videos: VideoFile[]) => void;
  setCurrentVideo: (videoId: string) => void;
  getNextVideo: () => VideoFile | null;
  getPreviousVideo: () => VideoFile | null;
  getCurrentIndex: () => number;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  mode: 'random',
  currentVideoId: null,
  playlist: [],

  setMode: (mode) => {
    set({ mode });
  },

  setPlaylist: (videos) => {
    set({ playlist: videos });
  },

  setCurrentVideo: (videoId) => {
    set({ currentVideoId: videoId });
  },

  getCurrentIndex: () => {
    const { playlist, currentVideoId } = get();
    if (!currentVideoId) return -1;
    return playlist.findIndex(v => v.hash === currentVideoId);
  },

  getNextVideo: () => {
    const { mode, playlist, currentVideoId } = get();
    
    if (playlist.length === 0) return null;

    if (mode === 'random') {
      // Random mode: pick random video excluding current
      const available = currentVideoId
        ? playlist.filter(v => v.hash !== currentVideoId)
        : playlist;
      
      if (available.length === 0) return playlist[0];
      
      const randomIndex = Math.floor(Math.random() * available.length);
      return available[randomIndex];
    }

    // Sequential mode: next in list, loop to start
    const currentIndex = get().getCurrentIndex();
    
    if (currentIndex === -1) {
      return playlist[0];
    }

    const nextIndex = (currentIndex + 1) % playlist.length;
    return playlist[nextIndex];
  },

  getPreviousVideo: () => {
    const { mode, playlist, currentVideoId } = get();
    
    if (playlist.length === 0) return null;

    if (mode === 'random') {
      // Random mode: pick random video excluding current
      const available = currentVideoId
        ? playlist.filter(v => v.hash !== currentVideoId)
        : playlist;
      
      if (available.length === 0) return playlist[0];
      
      const randomIndex = Math.floor(Math.random() * available.length);
      return available[randomIndex];
    }

    // Sequential mode: previous in list, loop to end
    const currentIndex = get().getCurrentIndex();
    
    if (currentIndex === -1) {
      return playlist[playlist.length - 1];
    }

    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    return playlist[prevIndex];
  },
}));
