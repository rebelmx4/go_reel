import { create } from 'zustand';

export interface Screenshot {
  filename: string;
  timestamp: number; 
  path: string;      
  type: 'manual' | 'auto';
}

interface ScreenshotState {
  screenshots: Screenshot[];
  isCropMode: boolean;
  
  setScreenshots: (screenshots: Screenshot[]) => void;
  clearScreenshots: () => void;
  setCropMode: (enabled: boolean) => void;
}

export const useScreenshotStore = create<ScreenshotState>((set) => ({
  screenshots: [],
  isCropMode: false,
  
  setScreenshots: (screenshots) => set({ screenshots }),

  clearScreenshots: () => set({ screenshots: [] }),

  setCropMode: (enabled) => set({ isCropMode: enabled }),
}));
