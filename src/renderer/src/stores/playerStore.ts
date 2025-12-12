// src/stores/playerStore.ts (已修复和增强)

import { create } from 'zustand';

/**
 * Video player state interface
 */
interface PlayerState {
  currentVideoPath: string | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  rotation: 0 | 90 | 180 | 270;
  stepMode: 'frame' | 'second';
  skipFrameMode: boolean;
  framerate: number;
  skipFrameConfig: Record<string, number>;
  skipDuration: number;
  
  // --- Setters (设置器) ---
  setCurrentVideo: (path: string) => void;
  setPlaying: (playing: boolean) => void;
  // 【修复1】允许 setVolume 接收一个函数，用于基于前一个状态进行更新
  setVolume: (volume: number | ((prevVolume: number) => number)) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setRotation: (rotation: 0 | 90 | 180 | 270) => void;
  setStepMode: (mode: 'frame' | 'second') => void;
  setSkipFrameMode: (enabled: boolean) => void;
  setFramerate: (framerate: number) => void;
  setSkipFrameConfig: (config: Record<string, number>) => void;
  setSkipDuration: (duration: number) => void;

  // --- Actions (动作) ---
  // 【修复2】新增业务逻辑函数
  togglePlay: () => void;
  stepForward: () => void;
  stepBackward: () => void;
}

/**
 * Video player store
 * Manages video playback state
 */
export const usePlayerStore = create<PlayerState>((set, get) => ({
  // --- 初始状态 (Initial State) ---
  currentVideoPath: null,
  isPlaying: false,
  volume: 80,
  currentTime: 0,
  duration: 0,
  rotation: 0,
  stepMode: 'frame',
  skipFrameMode: false,
  framerate: 30,
  skipFrameConfig: {},
  skipDuration: 2,

  // --- Setters (设置器实现) ---
  setCurrentVideo: (path) => set({ currentVideoPath: path, currentTime: 0, duration: 0, isPlaying: false }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  // 【修复1】实现更灵活的 setVolume
  setVolume: (volume) => set((state) => ({
    volume: Math.max(0, Math.min(100, typeof volume === 'function' ? volume(state.volume) : volume)),
  })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setRotation: (rotation) => set({ rotation }),
  setStepMode: (mode) => set({ stepMode: mode }),
  setSkipFrameMode: (enabled) => set({ skipFrameMode: enabled }),
  setFramerate: (framerate) => set({ framerate }),
  setSkipFrameConfig: (config) => set({ skipFrameConfig: config }),
  setSkipDuration: (duration) => set({ skipDuration: duration }),

  // --- Actions (动作实现) ---
  // 【修复2】实现新增的业务逻辑函数
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  stepForward: () => {
    const { currentTime, duration, stepMode, framerate } = get();
    const step = stepMode === 'frame' ? 1 / framerate : 1;
    const newTime = Math.min(currentTime + step, duration);
    set({ currentTime: newTime });
  },

  stepBackward: () => {
    const { currentTime, stepMode, framerate } = get();
    const step = stepMode === 'frame' ? 1 / framerate : 1;
    const newTime = Math.max(currentTime - step, 0);
    set({ currentTime: newTime });
  },
}));