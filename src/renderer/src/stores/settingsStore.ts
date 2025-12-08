import { create } from 'zustand';

export interface SkipFrameConfig {
  [key: string]: number; // e.g., "60s": 0, "30m": 10
}

interface SettingsState {
  // Skip frame settings
  skipFrameConfig: SkipFrameConfig;
  skipDuration: number;
  lastPlayMode: 'normal' | 'skip';
  
  // Global settings
  globalVolume: number;
  
  // Actions
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  setSkipFrameConfig: (config: SkipFrameConfig) => void;
  setSkipDuration: (duration: number) => void;
  setLastPlayMode: (mode: 'normal' | 'skip') => void;
  setGlobalVolume: (volume: number) => void;
}

// Default configuration
const DEFAULT_SKIP_FRAME_CONFIG: SkipFrameConfig = {
  '60s': 0,      // 1分钟以内不跳帧
  '30m': 10,     // 1-30分钟分10段
  '120m': 30,    // 30分钟-2小时分30段
  '10000m': 60   // 2小时以上分60段
};

const DEFAULT_SKIP_DURATION = 2; // 秒

export const useSettingsStore = create<SettingsState>((set, get) => ({
  skipFrameConfig: DEFAULT_SKIP_FRAME_CONFIG,
  skipDuration: DEFAULT_SKIP_DURATION,
  lastPlayMode: 'normal',
  globalVolume: 50,

  loadSettings: async () => {
    try {
      if (window.api?.loadSettings) {
        const settings = await window.api.loadSettings();
        set({
          skipFrameConfig: settings.skip_frame || DEFAULT_SKIP_FRAME_CONFIG,
          skipDuration: settings.skip_duration || DEFAULT_SKIP_DURATION,
          lastPlayMode: settings.last_play_mode || 'normal',
          globalVolume: settings.global_volume ?? 50,
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  saveSettings: async () => {
    try {
      const state = get();
      if (window.api?.saveSettings) {
        await window.api.saveSettings({
          skip_frame: state.skipFrameConfig,
          skip_duration: state.skipDuration,
          last_play_mode: state.lastPlayMode,
          global_volume: state.globalVolume,
        });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  setSkipFrameConfig: (config) => {
    set({ skipFrameConfig: config });
    get().saveSettings();
  },

  setSkipDuration: (duration) => {
    set({ skipDuration: duration });
    get().saveSettings();
  },

  setLastPlayMode: (mode) => {
    set({ lastPlayMode: mode });
    get().saveSettings();
  },

  setGlobalVolume: (volume) => {
    set({ globalVolume: volume });
    get().saveSettings();
  },
}));
