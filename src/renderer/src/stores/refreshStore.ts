import { create } from 'zustand';

export interface RefreshProgress {
  totalFiles: number;
  processedFiles: number;
  currentDirectory: string;
  isRefreshing: boolean;
}

interface RefreshState {
  progress: RefreshProgress;
  
  // Actions
  startRefresh: () => void;
  updateProgress: (processed: number, total: number, directory: string) => void;
  finishRefresh: () => void;
  cancelRefresh: () => void;
}

export const useRefreshStore = create<RefreshState>((set) => ({
  progress: {
    totalFiles: 0,
    processedFiles: 0,
    currentDirectory: '',
    isRefreshing: false,
  },

  startRefresh: () => {
    set({
      progress: {
        totalFiles: 0,
        processedFiles: 0,
        currentDirectory: '正在扫描...',
        isRefreshing: true,
      }
    });
  },

  updateProgress: (processed, total, directory) => {
    set(state => ({
      progress: {
        ...state.progress,
        processedFiles: processed,
        totalFiles: total,
        currentDirectory: directory,
      }
    }));
  },

  finishRefresh: () => {
    set({
      progress: {
        totalFiles: 0,
        processedFiles: 0,
        currentDirectory: '',
        isRefreshing: false,
      }
    });
  },

  cancelRefresh: () => {
    set({
      progress: {
        totalFiles: 0,
        processedFiles: 0,
        currentDirectory: '',
        isRefreshing: false,
      }
    });
  },
}));
