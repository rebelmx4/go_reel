import { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { useNavigationStore, usePlayerStore, useRefreshStore, usePlaylistStore } from './stores';
import { MainLayout, ToastContainer, PathConfigurationScreen, VideoPlayer } from './components';
import { TagSearchPage } from './pages/TagSearchPage';
import { RecentPage } from './pages/RecentPage';
import { NewestPage } from './pages/NewestPage';
import { SearchPage } from './pages/SearchPage';
import { LikedPage } from './pages/LikedPage';
import { ElitePage } from './pages/ElitePage';
import { SettingsPage } from './pages/SettingsPage'; // 确保引入了 SettingsPage
import { RefreshLoadingScreen } from './components/RefreshLoadingScreen';
import { RecordingIndicator } from './components/RecordingIndicator';

// 1. 导入 keyBindingManager 的单例实例
import { keyBindingManager } from './utils/keyBindingManager';

function App() {
  const currentView = useNavigationStore((state) => state.currentView);
  const setView = useNavigationStore((state) => state.setView);
  const setCurrentVideo = usePlayerStore((state) => state.setCurrentVideo);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const setSkipFrameConfig = usePlayerStore((state) => state.setSkipFrameConfig);
  const setSkipDuration = usePlayerStore((state) => state.setSkipDuration);
  const setPlaylist = usePlaylistStore((state) => state.setPlaylist);
  const setPlaylistMode = usePlaylistStore((state) => state.setMode);

  // useEffect 1: 应用启动时加载数据和配置
  useEffect(() => {
    const loadStartup = async () => {
      try {
        const result = await window.api.getStartupResult();

        if (result.needsConfiguration) {
          setView('configuration');
        } else {
          // 加载初始视频
          if (result.initialVideo) {
            setCurrentVideo(result.initialVideo.path);
            if (result.playlists?.all) {
              setPlaylistMode('random');
              setPlaylist(result.playlists.all);
            }
          }

          // 加载所有设置
          const settings = await window.api.loadSettings();

          // 2. 使用加载的设置来初始化快捷键管理器
          // 这是关键的第一步，它告诉管理器所有的快捷键规则
          if (settings.key_bindings) {
            keyBindingManager.initialize(settings.key_bindings);
          }

          // 恢复音量
          if (settings.playback?.global_volume !== undefined) {
            setVolume(settings.playback.global_volume);
          }

          // 加载跳帧预览配置
          if (settings.skip_frame) {
            setSkipFrameConfig(settings.skip_frame.rules);
            setSkipDuration(settings.skip_frame.skip_duration);
          }

          // 切换到播放器视图
          setView('player');
        }
      } catch (error) {
        console.error('Failed to load startup result:', error);
        setView('configuration');
      }
    };

    loadStartup();
    // 依赖项为空数组，确保此 effect 仅在应用启动时运行一次
  }, [setView, setCurrentVideo, setVolume, setSkipFrameConfig, setSkipDuration, setPlaylist, setPlaylistMode]);

  // useEffect 2: 设置快捷键处理器和事件监听
  useEffect(() => {
    // TODO: Load key bindings from settings
    // For now, register basic navigation shortcuts
    const handleKeyPress = (event: KeyboardEvent) => {
      // F5 refresh handler
      if (event.key === 'F5') {
        event.preventDefault();
        const isRefreshing = useRefreshStore.getState().progress.isRefreshing;
        if (!isRefreshing) {
          const startRefresh = useRefreshStore.getState().startRefresh;
          const updateProgress = useRefreshStore.getState().updateProgress;
          const finishRefresh = useRefreshStore.getState().finishRefresh;

          startRefresh();

          // TODO: Implement actual file scanning via Electron IPC
          setTimeout(() => updateProgress(50, 100, 'E:\\Videos\\Sample'), 1000);
          setTimeout(() => updateProgress(100, 100, '完成'), 2500);
          setTimeout(() => finishRefresh(), 3000);
        }
        return;
      }

      keyBindingManager.handleKeyPress(event);
    };

    // 4. 注册所有动作对应的处理器函数
    // 这告诉管理器，当 'list_recent' 动作被触发时，应该做什么
    keyBindingManager.registerHandler('list_recent', () => setView('recent'));
    keyBindingManager.registerHandler('list_newest', () => setView('newest'));
    keyBindingManager.registerHandler('list_search', () => setView('search'));
    keyBindingManager.registerHandler('list_random', () => setView('random'));
    keyBindingManager.registerHandler('list_liked', () => setView('liked'));
    keyBindingManager.registerHandler('list_elite', () => setView('elite'));
    keyBindingManager.registerHandler('back_to_player', () => setView('player'));
    // 在这里可以注册更多的处理器，例如播放控制等

    // 5. 添加全局事件监听器
    window.addEventListener('keydown', handleKeyPress);

    // 6. 返回一个清理函数，在组件卸载时移除监听器和处理器，防止内存泄漏
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      keyBindingManager.clearHandlers();
    };
  }, [setView]); // setView 是依赖项，因为处理器函数闭包了它

  // 渲染当前视图
  const renderView = () => {
    switch (currentView) {
      case 'configuration': return <PathConfigurationScreen />;
      case 'player': return <VideoPlayer />;
      case 'recent': return <RecentPage />;
      case 'newest': return <NewestPage />;
      case 'search': return <SearchPage />;
      case 'random': return <div style={{ padding: 20 }}>随机推荐 (待实现)</div>;
      case 'liked': return <LikedPage />;
      case 'elite': return <ElitePage />;
      case 'tag-search': return <TagSearchPage />;
      case 'settings': return <SettingsPage />; // 确保这里是 SettingsPage
      default: return <div style={{ padding: 20 }}>未知视图</div>;
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