import { create } from 'zustand';
import { VideoClip } from '../../../shared/models';


interface ClipState {
  clips: VideoClip[];
   isEditing: boolean; // 新增：是否处于编辑模式（编辑模式不触发自动跳过）
  // Actions

  setClips: (clips: VideoClip[]) => void;
  setIsEditing: (val: boolean) => void;
  initializeClips: (duration: number, existingClips?: VideoClip[]) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  toggleClipState: (clipId: string) => void;
  mergeClip: (time: number) => void; 
  getClipAtTime: (time: number) => VideoClip | undefined;
  clearClips: () => void;
}

export const useClipStore = create<ClipState>((set, get) => ({
  clips: [],

   isEditing: false,

  setIsEditing: (isEditing) => set({ isEditing }),
  setClips: (clips) => set({ clips }),

  initializeClips: (duration, existingClips) => {
    if (existingClips && existingClips.length > 0) {
      set({ clips: existingClips });
    } else {
      set({
        clips: [{
          id: `clip_${Date.now()}`,
          startTime: 0,
          endTime: duration,
          state: 'keep'
        }]
      });
    }
  },

  splitClip: (clipId, splitTime) => {
    const state = get();
    const clipIndex = state.clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) return;

    const clip = state.clips[clipIndex];
    
    // Check if split time is within clip bounds
    if (splitTime <= clip.startTime || splitTime >= clip.endTime) return;

    // Create two new clips
    const leftClip: VideoClip = {
      id: `clip_${Date.now()}_left`,
      startTime: clip.startTime,
      endTime: splitTime,
      state: clip.state
    };

    const rightClip: VideoClip = {
      id: `clip_${Date.now()}_right`,
      startTime: splitTime,
      endTime: clip.endTime,
      state: clip.state
    };

    // Replace original clip with two new clips
    const newClips = [...state.clips];
    newClips.splice(clipIndex, 1, leftClip, rightClip);
    
    set({ clips: newClips });
  },

  toggleClipState: (clipId) => {
    set((state) => ({
      clips: state.clips.map(clip =>
        clip.id === clipId
          ? { ...clip, state: clip.state === 'keep' ? 'remove' : 'keep' }
          : clip
      )
    }));
  },

  mergeClip: (time: number) => {
    const state = get();
    // 找到当前时间所在的片段索引
    const clipIndex = state.clips.findIndex(c => time >= c.startTime && time <= c.endTime);
    if (clipIndex === -1) return;

    let newClips = [...state.clips];
    
    if (clipIndex > 0) {
      // 向左愈合：前一个片段延伸到当前片段的末尾
      const leftClip = newClips[clipIndex - 1];
      newClips[clipIndex - 1] = {
        ...leftClip,
        endTime: newClips[clipIndex].endTime,
      };
      newClips.splice(clipIndex, 1);
      set({ clips: newClips });
    } else if (clipIndex === 0 && newClips.length > 1) {
        // 如果是第一段，尝试合并右侧
        const currentClip = newClips[0];
        const rightClip = newClips[1];
        newClips[0] = {
            ...currentClip,
            endTime: rightClip.endTime,
        };
        newClips.splice(1, 1);
        set({ clips: newClips });
    }
  },

    getClipAtTime: (time) => {
    return get().clips.find(c => time >= c.startTime && time < c.endTime);
  },

  clearClips: () => {
    set({ clips: [] });
  }
}));
