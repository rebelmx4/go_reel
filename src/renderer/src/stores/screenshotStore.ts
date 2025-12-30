// src/stores/screenshotStore.ts

import { create } from 'zustand';

export interface Screenshot {
  filename: string;
  timestamp: number;
  path: string;
  type: 'manual' | 'auto';
}

interface ScreenshotState {
  screenshots: Screenshot[];
  isLoading: boolean;
  currentPath: string | null;
  isCropMode: boolean; 
  // --- Actions ---
  /** 加载截图：如果后端正在生成，它会处理重试逻辑 */
  loadScreenshots: (path: string, retryCount?: number) => Promise<void>;
  
  /** 手动截图 */
  captureManual: (path: string, timestampSeconds: number) => Promise<boolean>;
  
  /** 删除截图 */
  deleteScreenshot: (path: string, filename: string) => Promise<void>;

  /** 设置封面 */
  setAsCover: (path: string, screenshotPath: string) => Promise<boolean>;

  clear: () => void;

  setCropMode: (enabled: boolean) => void;
}

export const useScreenshotStore = create<ScreenshotState>((set, get) => ({
  screenshots: [],
  isLoading: false,
  currentPath: null,
  isCropMode: false,

  loadScreenshots: async (path: string) => {
  // 1. 基础状态检查
  if (get().currentPath === path && get().screenshots.length > 0) return;

  set({ isLoading: true, currentPath: path, screenshots: [] });

  try {
    // 2. 直接 await。
    // 如果是第一次生成，后端会卡在这里几秒，但这正是我们需要的，因为此时 isLoading 为 true
    const data = await window.api.loadScreenshots(path);
    
    // 3. 只有当用户还没切换到其他视频时，才更新状态
    if (get().currentPath === path) {
      set({ screenshots: data, isLoading: false });
    }
  } catch (error) {
    console.error("Failed to load screenshots:", error);
    set({ isLoading: false });
  }
},

  setCropMode: (enabled) => set({ isCropMode: enabled }),

  captureManual: async (path, timestamp) => {
    const success = await window.api.saveManualScreenshot(path, timestamp);
    if (success) {
      const data = await window.api.loadScreenshots(path);
      set({ screenshots: data });
    }
    return success;
  },

  deleteScreenshot: async (path, filename) => {
    await window.api.deleteScreenshot(path, filename);
    set(state => ({
      screenshots: state.screenshots.filter(s => s.filename !== filename)
    }));
  },

  setAsCover: async (path, screenshotPath) => {
    return await window.api.setManualCover(path, screenshotPath);
  },

  clear: () => set({ screenshots: [], currentPath: null, isLoading: false }),
}));