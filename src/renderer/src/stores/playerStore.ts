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
  framerate: number; // Video framerate (fps)
  skipFrameConfig: Record<string, number>; // Skip frame configuration
  skipDuration: number; // Duration to pause at each frame (seconds)
  
  setCurrentVideo: (path: string) => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setRotation: (rotation: 0 | 90 | 180 | 270) => void;
  setStepMode: (mode: 'frame' | 'second') => void;
  setSkipFrameMode: (enabled: boolean) => void;
  setFramerate: (framerate: number) => void;
  setSkipFrameConfig: (config: Record<string, number>) => void;
  setSkipDuration: (duration: number) => void;
}

/**
 * Video player store
 * Manages video playback state
 */
export const usePlayerStore = create<PlayerState>((set) => ({
  currentVideoPath: null,
  isPlaying: false,
  volume: 80,
  currentTime: 0,
  duration: 0,
  rotation: 0,
  stepMode: 'frame',
  skipFrameMode: false,
  framerate: 30, // Default 30fps
  skipFrameConfig: {
    '60s': 0,
    '30m': 10,
    '120m': 30,
    '10000m': 60
  },
  skipDuration: 2,

  setCurrentVideo: (path) => set({ currentVideoPath: path, currentTime: 0, duration: 0 }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setRotation: (rotation) => set({ rotation }),
  setStepMode: (mode) => set({ stepMode: mode }),
  setSkipFrameMode: (enabled) => set({ skipFrameMode: enabled }),
  setFramerate: (framerate) => set({ framerate }),
  setSkipFrameConfig: (config) => set({ skipFrameConfig: config }),
  setSkipDuration: (duration) => set({ skipDuration: duration }),
}));
