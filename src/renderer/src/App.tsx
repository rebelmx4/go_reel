import { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

// 导入新的 Store 结构
import {
  useNavigationStore,
  usePlayerStore,
  useRefreshStore,
  usePlaylistStore,
  useVideoStore
} from './stores';

import {
  MainLayout,
  ToastContainer,
  VideoPlayer
} from './components';

import {
  TagSearchPage,
  HistoryPage,
  NewestPage,
  SearchPage,
  LikedPage,
  ElitePage,
  SettingsPage
} from './pages';

import { RefreshLoadingScreen } from './components/RefreshLoadingScreen';
import { RecordingIndicator } from './components/RecordingIndicator';
import { keyBindingManager } from './utils/keyBindingManager';

function App() {
  // Navigation
  const currentView = useNavigationStore((state) => state.currentView);
  const setView = useNavigationStore((state) => state.setView);

  // Video & Playlist
  const initVideoStore = useVideoStore((state) => state.initStore);
  const refreshVideos = useVideoStore((state) => state.refreshVideos);
  const setPlaylistMode = usePlaylistStore((state) => state.setMode);
  const setCurrentPath = usePlaylistStore((state) => state.setCurrentPath);

  // Player Settings
  const setVolume = usePlayerStore((state) => state.setVolume);
  const setSkipFrameConfig = usePlayerStore((state) => state.setSkipFrameConfig);
  const setSkipDuration = usePlayerStore((state) => state.setSkipDuration);

  // Refresh Progress UI
  const { startRefresh, finishRefresh } = useRefreshStore();

  /**
   * Effect 1: 应用启动初始化
   */
  useEffect(() => {
    const loadStartup = async () => {
      try {
        // 1. 初始化视频数据中心 (内部已包含 getStartupResult)
        await initVideoStore();

        // 2. 加载全局设置
        const settings = await window.api.loadSettings();

        // 3. 初始化快捷键
        if (settings.key_bindings) {
          keyBindingManager.initialize(settings.key_bindings);
        }

        // 4. 恢复播放器设置
        if (settings.playback?.global_volume !== undefined) {
          setVolume(settings.playback.global_volume);
        }
        // if (settings.skip_frame) {
        //   setSkipFrameConfig(settings.skip_frame.rules);
        //   setSkipDuration(settings.skip_frame.skip_duration);
        // }

        // 5. 设置默认播放模式
        setPlaylistMode('all');

        // 如果想在启动时自动播放第一个视频，可以取消下面注释
        const firstPath = useVideoStore.getState().videoPaths[0];
        if (firstPath) setCurrentPath(firstPath);

        // 6. 进入播放器视图
        setView('player');

      } catch (error) {
        console.error('应用初始化失败:', error);
        setView('player');
      }
    };

    loadStartup();
  }, [
    initVideoStore, setVolume, setSkipFrameConfig,
    setSkipDuration, setPlaylistMode, setView
  ]);

  /**
   * Effect 2: 全局事件监听 (快捷键 & 刷新)
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. 处理 F5 刷新逻辑
      if (event.key === 'F5') {
        event.preventDefault();
        const isRefreshing = useRefreshStore.getState().progress.isRefreshing;
        if (!isRefreshing) {
          startRefresh();
          // 调用真正的后端刷新接口
          refreshVideos().finally(() => {
            finishRefresh();
          });
        }
        return;
      }

      // 2. 派发给快捷键管理器
      keyBindingManager.handleKeyPress(event);
    };

    // 3. 注册导航快捷键处理器
    keyBindingManager.registerHandler('list_history', () => setView('history'));
    keyBindingManager.registerHandler('list_newest', () => setView('newest'));
    keyBindingManager.registerHandler('list_search', () => setView('search'));
    keyBindingManager.registerHandler('list_liked', () => setView('liked'));
    keyBindingManager.registerHandler('list_elite', () => setView('elite'));
    keyBindingManager.registerHandler('back_to_player', () => setView('player'));
    keyBindingManager.registerHandler('open_settings', () => setView('settings'));

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      keyBindingManager.clearHandlers();
    };
  }, [setView, startRefresh, finishRefresh, refreshVideos]);

  // 渲染逻辑
  const renderView = () => {
    switch (currentView) {
      case 'player': return <VideoPlayer />;
      case 'history': return <HistoryPage />;
      case 'newest': return <NewestPage />;
      case 'search': return <SearchPage />;
      case 'liked': return <LikedPage />;
      case 'elite': return <ElitePage />;
      case 'tag-search': return <TagSearchPage />;
      case 'settings': return <SettingsPage />;
      default: return <VideoPlayer />;
    }
  };

  return (
    <MantineProvider defaultColorScheme="dark">
      <MainLayout>{renderView()}</MainLayout>
      <ToastContainer />
      <RefreshLoadingScreen />
      <RecordingIndicator />
    </MantineProvider>
  );
}

export default App;