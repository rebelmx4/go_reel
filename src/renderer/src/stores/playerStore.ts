// src/stores/playerStore.ts

import { create } from 'zustand';

export type SidebarTab = 'newest' | 'elite';

interface PlayerState {
  // 基础状态
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  playbackRate: number; // 新增：倍速播放
  
  // 视觉状态
  rotation: number; 

  // --- 侧边栏状态优化 ---
  showSidebar: boolean;
  sidebarTab: SidebarTab; // 记录当前/上次选中的标签
  
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

  // 侧边栏控制逻辑
  setShowSidebar: (show: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleSidebar: () => void; // 全局开关：基于上次的 tab 打开/关闭
  handleSidebarTabClick: (tab: SidebarTab) => void; // VS Code 式逻辑

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
  sidebarTab: 'newest', // 默认选中“最新”

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
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
  
  // 全局开关：如果是关闭的，则打开上次记录的 tab
  toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),

  // VS Code 逻辑：
  // 1. 如果侧边栏关闭 -> 打开并切换到该 tab
  // 2. 如果侧边栏开启且 tab 不同 -> 切换 tab
  // 3. 如果侧边栏开启且 tab 相同 -> 关闭侧边栏
  handleSidebarTabClick: (tab) => {
    const { showSidebar, sidebarTab } = get();
    if (showSidebar && sidebarTab === tab) {
      set({ showSidebar: false });
    } else {
      set({ showSidebar: true, sidebarTab: tab });
    }
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  reset: () => set({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    rotation: 0 // 切换时先归零，后续由组件根据 Annotation 补齐
  })
}));