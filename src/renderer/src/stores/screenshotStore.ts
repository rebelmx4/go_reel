import { create } from 'zustand';

export interface Screenshot {
  id: string;
  timestamp: number; // Video time in seconds
  dataUrl: string;
  width: number;
  height: number;
  createdAt: number; // Unix timestamp
}

interface ScreenshotState {
  screenshots: Screenshot[];
  isCropMode: boolean;
  
  addScreenshot: (screenshot: Screenshot) => void;
  removeScreenshot: (id: string) => void;
  clearScreenshots: () => void;
  setCropMode: (enabled: boolean) => void;
}

export const useScreenshotStore = create<ScreenshotState>((set) => ({
  screenshots: [],
  isCropMode: false,

  addScreenshot: (screenshot) => set((state) => ({
    screenshots: [...state.screenshots, screenshot]
  })),

  removeScreenshot: (id) => set((state) => ({
    screenshots: state.screenshots.filter(s => s.id !== id)
  })),

  clearScreenshots: () => set({ screenshots: [] }),

  setCropMode: (enabled) => set({ isCropMode: enabled }),
}));
