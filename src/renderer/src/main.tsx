import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useVideoStore, usePlayerStore, usePlaylistStore, useNavigationStore } from './stores';
import { keyBindingManager } from './utils/KeyBindingManager';
import App from './App'


/**
 * 启动逻辑：在组件树渲染前或渲染过程中并行执行
 */
const bootstrap = async () => {
  // 获取 store 的 Action
  const videoStore = useVideoStore.getState();
  const playerStore = usePlayerStore.getState();
  const playlistStore = usePlaylistStore.getState();
  const navStore = useNavigationStore.getState();

  try {
    // 1. 触发视频初始化 (不需要 await，让它异步跑)
    videoStore.initStore().then(() => {
      // 初始化完成后，可以自动设置第一个视频为当前播放
      const firstPath = useVideoStore.getState().videoPaths[0];
      if (firstPath) playlistStore.setCurrentPath(firstPath);
    });

    // 2. 加载用户设置
    const settings = await window.api.loadSettings();

    // 3. 配置快捷键管理器
    if (settings.key_bindings) {
      keyBindingManager.initialize(settings.key_bindings);
    }

    // 4. 恢复播放器音量等设置
    if (settings.playback?.global_volume !== undefined) {
      playerStore.setVolume(settings.playback.global_volume);
    }

    // 5. 设置初始状态
    playlistStore.setMode('all');
    navStore.setView('player');

    // if (settings.skip_frame) {
    //   setSkipFrameConfig(settings.skip_frame.rules);
    //   setSkipDuration(settings.skip_frame.skip_duration);
    // }

  } catch (error) {
    console.error('Bootstrap failed:', error);
  }
};

bootstrap();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
