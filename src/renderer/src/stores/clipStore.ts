import { create } from 'zustand'
import { VideoClip } from '../../../shared/models'
import { usePlaylistStore } from './playlistStore'
import { useToastStore } from './toastStore'

interface ClipState {
  clips: VideoClip[]
  isEditing: boolean // 是否处于编辑模式（编辑模式不触发自动跳过）

  setIsEditing: (val: boolean) => void
  initializeClips: (duration: number, existingClips?: VideoClip[]) => void
  splitClip: (clipId: string, splitTime: number) => void
  toggleClipState: (clipId: string) => void
  mergeClip: (time: number) => void
  getClipAtTime: (time: number) => VideoClip | undefined
  clearClips: () => void

  _syncToDisk: () => Promise<void>
}

export const useClipStore = create<ClipState>((set, get) => ({
  clips: [],
  isEditing: false,

  _syncToDisk: async () => {
    const { clips } = get()
    const currentPath = usePlaylistStore.getState().currentPath

    if (!currentPath || clips.length === 0) return

    try {
      const result = await window.api.updateAnnotation(currentPath, { clips })
      if (!result.success) {
        useToastStore.getState().showToast({ message: '同步失败', type: 'error' })
      }
    } catch (error) {
      console.error('Failed to sync clips:', error)
      useToastStore.getState().showToast({ message: '保存过程出错', type: 'error' })
    }
  },

  setIsEditing: (isEditing) => set({ isEditing }),

  initializeClips: (duration, existingClips) => {
    if (existingClips && existingClips.length > 0) {
      set({ clips: existingClips })
    } else {
      set({ clips: [createClip(0, duration)] })
    }
  },

  splitClip: async (clipId, splitTime) => {
    const state = get()
    const clipIndex = state.clips.findIndex((c) => c.id === clipId)
    if (clipIndex === -1) return

    const clip = state.clips[clipIndex]

    // Check if split time is within clip bounds
    if (splitTime <= clip.startTime || splitTime >= clip.endTime) return

    const leftClip = createClip(clip.startTime, splitTime, clip.state)
    const rightClip = createClip(splitTime, clip.endTime, clip.state)

    // Replace original clip with two new clips
    const newClips = [...state.clips]
    newClips.splice(clipIndex, 1, leftClip, rightClip)

    set({ clips: newClips })

    await get()._syncToDisk()
  },

  toggleClipState: async (clipId) => {
    set((state) => ({
      clips: state.clips.map((c) =>
        c.id === clipId ? { ...c, state: c.state === 'keep' ? 'remove' : 'keep' } : c
      )
    }))

    await get()._syncToDisk()
  },

  mergeClip: async (time: number) => {
    const state = get()
    // 找到当前时间所在的片段索引
    const clipIndex = state.clips.findIndex((c) => time >= c.startTime && time <= c.endTime)
    if (clipIndex === -1) return

    const newClips = [...state.clips]

    if (clipIndex > 0) {
      // 向左愈合：前一个片段延伸到当前片段的末尾
      const leftClip = newClips[clipIndex - 1]
      newClips[clipIndex - 1] = {
        ...leftClip,
        endTime: newClips[clipIndex].endTime
      }
      newClips.splice(clipIndex, 1)
      set({ clips: newClips })
    } else if (clipIndex === 0 && newClips.length > 1) {
      // 如果是第一段，尝试合并右侧
      const currentClip = newClips[0]
      const rightClip = newClips[1]
      newClips[0] = {
        ...currentClip,
        endTime: rightClip.endTime
      }
      newClips.splice(1, 1)
      set({ clips: newClips })
    }

    await get()._syncToDisk()
  },

  getClipAtTime: (time) => {
    return get().clips.find((c) => time >= c.startTime && time < c.endTime)
  },

  clearClips: () => {
    set({ clips: [] })
  }
}))

export const createClip = (
  startTime: number,
  endTime: number,
  state: 'keep' | 'remove' = 'keep'
): VideoClip => ({
  // 使用 时间戳 + 随机字符串 确保 ID 绝对唯一
  id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  startTime,
  endTime,
  state
})
