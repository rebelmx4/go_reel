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
}

export const useScreenshotStore = create<ScreenshotState>((set, get) => ({
  screenshots: [],
  isLoading: false,
  currentPath: null,

  loadScreenshots: async (path: string, retryCount = 0) => {
    // 避免对同一个路径重复加载（除非是重试）
    if (retryCount === 0) {
      if (get().currentPath === path && get().screenshots.length > 0) return;
      set({ isLoading: true, currentPath: path, screenshots: [] });
    }

    try {
      const data = await window.api.loadScreenshots(path);
      
      if (data.length > 0) {
        set({ screenshots: data, isLoading: false });
      } else {
        // ✨ 智能重试：如果后端返回空，可能正在生成中
        // 我们在 2秒和 5秒后尝试再次拉取
        if (retryCount < 2) {
          setTimeout(() => {
            // 只有当用户还在看这个视频时才重试
            if (get().currentPath === path) {
              get().loadScreenshots(path, retryCount + 1);
            }
          }, 2000 + retryCount * 3000); 
        } else {
          set({ isLoading: false }); // 重试几次还没拿到，停止 Loading
        }
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

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