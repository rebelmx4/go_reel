import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { usePlayerStore, usePlaylistStore, useVideoFileRegistryStore, useTagStore } from './stores'
import { keyBindingManager } from '@renderer/utils'
import App from './App'

/**
 * 启动逻辑：应用渲染前的核心数据初始化
 */
const bootstrap = async () => {
  // 1. 获取所有 Store 的实例 Action (getState 不会触发订阅，适合在逻辑脚本中使用)
  const videoRegistry = useVideoFileRegistryStore.getState()
  const playlist = usePlaylistStore.getState()
  const player = usePlayerStore.getState()
  const tagStore = useTagStore.getState()

  try {
    // 2. 核心：从后端一次性获取所有启动数据 (扫描结果、历史记录、用户设置)
    // 这是唯一的阻塞性 IPC 调用，保证了后续逻辑的数据基础
    const result = await window.api.getStartupResult()

    if (!result) {
      console.warn('Bootstrap: No startup result received.')
      return
    }

    const { videoList, history, preferenceStettings, tagLibrary } = result

    // 3. 分发数据到 VideoFileRegistryStore (档案库)
    videoRegistry.setInitialData(videoList)

    // 4. 将历史记录填入，以便在历史页面显示
    playlist.setHistoryPaths(history)

    // 5. 应用用户设置 (Settings)
    if (preferenceStettings) {
      // 配置快捷键管理器
      if (preferenceStettings.key_bindings) {
        keyBindingManager.bootstrap(preferenceStettings.key_bindings)
      }

      // 恢复播放器全局设置
      if (preferenceStettings.playback) {
        if (preferenceStettings.playback.global_volume !== undefined) {
          player.setVolume(preferenceStettings.playback.global_volume)
        }
        if (preferenceStettings.playback.default_rate !== undefined) {
          player.setPlaybackRate(preferenceStettings.playback.default_rate)
        }
      }
    }

    // 6. 确定初始播放目标
    // 规则：如果有扫描到视频，默认设置第一个为当前待播
    const allPaths = useVideoFileRegistryStore.getState().videoPaths
    if (allPaths.length > 0) {
      await playlist.next()
    }

    if (tagLibrary) {
      tagStore.setInitialData(tagLibrary)
    }

    console.log(`Bootstrap complete. Loaded ${videoList.length} files.`)
  } catch (error) {
    // 这里可以根据需要触发全局错误 UI
    console.error('Bootstrap failed critical error:', error)
  }
}

await bootstrap()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
