// src/stores/playerStore.ts

import { create } from 'zustand';

interface PlayerState {
  // 基础状态
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  playbackRate: number; // 新增：倍速播放
  
  // 视觉状态
  rotation: number; 

  showSidebar: boolean;
  
  // 帧控制技术参数
  stepMode: 'frame' | 'second';
  skipFrameMode: boolean; 
  framerate: number;
  
  // Setters
  setPlaying: (playing: boolean) => void;
  setVolume: (v: number) => void;
  setCurrentTime: (t: number) => void;
  volumeUp: () => void;
  volumeDown: () => void;
  setDuration: (d: number) => void;
  setRotation: (r: number) => void;
  setSkipFrameMode: (enabled: boolean) => void;   
  setFramerate: (fps: number) => void;
  setPlaybackRate: (rate: number) => void;

  setStepMode: (mode: 'frame' | 'second') => void; 

   // 侧边栏 Actions (新增)
  setShowSidebar: (show: boolean) => void;
  toggleSidebar: () => void;

  // 快捷操作
  togglePlay: () => void;
  reset: () => void; // 切换视频时重置状态
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isPlaying: false,
  volume: 80,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  rotation: 0,
  stepMode: 'frame',
  framerate: 30,
  skipFrameMode: false, // 初始化
  showSidebar: false, 

  setPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),
   volumeUp: () => {
    const { volume } = get();
    set({ volume: Math.min(volume + 5, 100) });
  },
  volumeDown: () => {
    const { volume } = get();
    set({ volume: Math.max(volume - 5, 0) });
  },
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setRotation: (rotation) => set({ rotation }),
  setStepMode: (mode) => set({ stepMode: mode }),
  setSkipFrameMode: (enabled) => set({ skipFrameMode: enabled }), // 补回此方法
  setFramerate: (framerate) => set({ framerate }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),

  // 侧边栏控制 (新增)
  setShowSidebar: (showSidebar) => set({ showSidebar }),
  toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  reset: () => set({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    rotation: 0 // 切换时先归零，后续由组件根据 Annotation 补齐
  })
}));