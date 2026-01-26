import { create } from 'zustand';
import { StepValue, DEFAULT_STEP_GRADIENT } from '../../../shared/constants';


export type SidebarTab = 'newest' | 'elite';

interface PlayerState {
  modals: {
    isAssignTagOpen: boolean;
    isCreateTagOpen: boolean;
    tagCoverImage: string; // 只有创建标签时需要暂存这个截图
  };

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
  skipFrameMode: boolean; 
  framerate: number;

  showClipTrack: boolean;
   toggleClipTrack: () => void; 
  
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

  stepMode: StepValue; 
  setStepMode: (mode: StepValue) => void;

  isHoverSeekMode: boolean; 
  setHoverSeekMode: (enabled: boolean) => void;

  // 侧边栏控制逻辑
  setShowSidebar: (show: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleSidebar: () => void; // 全局开关：基于上次的 tab 打开/关闭
  handleSidebarTabClick: (tab: SidebarTab) => void; // VS Code 式逻辑

  // 快捷操作
  togglePlay: () => void;
  reset: () => void; // 切换视频时重置状态

  // 专门控制弹窗的方法
  openAssignTagModal: () => void;
  closeAssignTagModal: () => void;
  
  openCreateTagModal: (coverImage: string) => void;
  closeCreateTagModal: () => void;
  setTagCoverImage: (cover: string) => void; 
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
   modals: {
    isAssignTagOpen: false,
    isCreateTagOpen: false,
    tagCoverImage: ''
  },

  isPlaying: false,
  volume: 80,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  rotation: 0,
  framerate: 30,
  skipFrameMode: false, 
  showSidebar: false, 
  sidebarTab: 'newest', 

  stepMode: 'frame',

  showClipTrack: false,
  toggleClipTrack: () => set((state) => ({ showClipTrack: !state.showClipTrack })),
  
  setStepMode: (stepMode) => set({ stepMode }),

  isHoverSeekMode: false,
  setHoverSeekMode: (isHoverSeekMode) => set({ isHoverSeekMode }),

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
  setRotation: (rotation) => set({ rotation }),
  setSkipFrameMode: (enabled) => set({ skipFrameMode: enabled }), 
  setFramerate: (framerate) => set({ framerate }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),

  setDuration: (duration) => {
        // 1. 设置时长
        set({ duration });

        // 2. 自动根据时长选择合适的步进梯度
        if (duration > 0) {
            const matched = DEFAULT_STEP_GRADIENT.find(g => duration <= g.threshold);
            if (matched) {
                set({ stepMode: matched.step });
            }
        }
    },

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
  }),

   openAssignTagModal: () => set((state) => ({ 
    modals: { ...state.modals, isAssignTagOpen: true },
    isPlaying: false // 打开弹窗自动暂停，逻辑内聚
  })),
  
  closeAssignTagModal: () => set((state) => ({ 
    modals: { ...state.modals, isAssignTagOpen: false } 
  })),

  openCreateTagModal: (coverImage) => set((state) => ({ 
    modals: { ...state.modals, isCreateTagOpen: true, tagCoverImage: coverImage },
    isPlaying: false // 打开弹窗自动暂停
  })),
  
  closeCreateTagModal: () => set((state) => ({ 
    modals: { ...state.modals, isCreateTagOpen: false, tagCoverImage: '' } 
  })),

   setTagCoverImage: (cover) => set((state) => ({
    modals: { ...state.modals, tagCoverImage: cover }
  })),
}));