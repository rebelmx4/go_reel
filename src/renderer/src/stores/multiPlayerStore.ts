// src/renderer/src/stores/multiPlayerStore.ts
import { create } from 'zustand'

interface MultiPlayerState {
  paths: string[]
  addPath: (path: string) => void
  removePath: (path: string) => void
  clearAll: () => void
}

export const MAX_MULTI_VIDEOS = 12 // 硬件解码上限建议值

export const useMultiPlayerStore = create<MultiPlayerState>((set) => ({
  paths: [],
  addPath: (path) =>
    set((state) => {
      if (state.paths.includes(path)) return state // 不重复添加
      if (state.paths.length >= MAX_MULTI_VIDEOS) return state
      return { paths: [...state.paths, path] }
    }),
  removePath: (path) =>
    set((state) => ({
      paths: state.paths.filter((p) => p !== path)
    })),
  clearAll: () => set({ paths: [] })
}))
