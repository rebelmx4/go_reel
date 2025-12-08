import { create } from 'zustand';

export interface VideoClip {
  id: string;
  startTime: number;
  endTime: number;
  state: 'keep' | 'remove'; // 保留或删除
}

interface ClipState {
  clips: VideoClip[];
  
  // Actions
  initializeClips: (duration: number) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  toggleClipState: (clipId: string) => void;
  mergeClip: (clipId: string) => void;
  clearClips: () => void;
}

export const useClipStore = create<ClipState>((set, get) => ({
  clips: [],

  initializeClips: (duration) => {
    set({
      clips: [{
        id: `clip_${Date.now()}`,
        startTime: 0,
        endTime: duration,
        state: 'keep'
      }]
    });
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

  mergeClip: (clipId) => {
    const state = get();
    const clipIndex = state.clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) return;

    let newClips = [...state.clips];
    
    // Determine merge direction
    if (clipIndex === 0) {
      // First clip: merge with right
      if (clipIndex + 1 < newClips.length) {
        const rightClip = newClips[clipIndex + 1];
        newClips[clipIndex] = {
          ...newClips[clipIndex],
          endTime: rightClip.endTime,
          state: rightClip.state // Inherit right clip's state
        };
        newClips.splice(clipIndex + 1, 1);
      }
    } else {
      // Other clips: merge with left
      const leftClip = newClips[clipIndex - 1];
      newClips[clipIndex - 1] = {
        ...leftClip,
        endTime: newClips[clipIndex].endTime,
        // Keep left clip's state
      };
      newClips.splice(clipIndex, 1);
    }

    set({ clips: newClips });
  },

  clearClips: () => {
    set({ clips: [] });
  }
}));
