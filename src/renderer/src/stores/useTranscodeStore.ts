// src/renderer/src/stores/useTranscodeStore.ts
import { create } from 'zustand'

export interface TranscodeTask {
  path: string
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
}

interface TranscodeState {
  tasks: TranscodeTask[]
  setTasks: (tasks: TranscodeTask[]) => void
}

export const useTranscodeStore = create<TranscodeState>((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks })
}))

// --- 自动初始化监听 ---
// 只要这个文件被引用（比如在 VideoPlayerContent 里），就会开始监听后端推送
if (window.api && window.api.onTranscodeUpdate) {
  window.api.onTranscodeUpdate((tasks) => {
    useTranscodeStore.getState().setTasks(tasks)
  })

  // 初始化时拉取一次当前队列（防止刷新页面后丢失显示）
  window.api.getTranscodeQueue().then((tasks) => {
    useTranscodeStore.getState().setTasks(tasks)
  })
}
