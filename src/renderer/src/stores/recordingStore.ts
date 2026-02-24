import { create } from 'zustand'

export interface RecordingState {
  isRecording: boolean
  startTime: number
  elapsedTime: number
  savedPlayerState: {
    skipFrameMode: boolean
    stepMode: 'frame' | 'second'
  } | null
}

interface RecordingStore extends RecordingState {
  // Actions
  startRecording: (playerState: { skipFrameMode: boolean; stepMode: 'frame' | 'second' }) => void
  stopRecording: () => void
  cancelRecording: () => void
  updateElapsedTime: (time: number) => void
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  isRecording: false,
  startTime: 0,
  elapsedTime: 0,
  savedPlayerState: null,

  startRecording: (playerState) => {
    set({
      isRecording: true,
      startTime: Date.now(),
      elapsedTime: 0,
      savedPlayerState: playerState
    })
  },

  stopRecording: () => {
    set({
      isRecording: false,
      startTime: 0,
      elapsedTime: 0,
      savedPlayerState: null
    })
  },

  cancelRecording: () => {
    set({
      isRecording: false,
      startTime: 0,
      elapsedTime: 0,
      savedPlayerState: null
    })
  },

  updateElapsedTime: (time) => {
    set({ elapsedTime: time })
  }
}))
