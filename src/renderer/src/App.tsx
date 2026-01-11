import { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { AppAction } from '../../shared/settings.schema';

// 导入新的 Store 结构
import {
  useNavigationStore,
  useRefreshStore
} from './stores';

import {
  MainLayout,
  ToastContainer
} from './components';

import { VideoPlayer } from './player/VideoPlayer';


import {
  TagSearchPage,
  HistoryPage,
  NewestPage,
  // SearchPage,
  // LikedPage,
  ElitePage,
  SettingsPage
} from './pages';

import { RefreshLoadingScreen } from './components/RefreshLoadingScreen';
import { RecordingIndicator } from './player/RecordingIndicator';
import { keyBindingManager } from './utils/KeyBindingManager';

function App() {
  // Navigation
  const currentView = useNavigationStore((state) => state.currentView);
  const setView = useNavigationStore((state) => state.setView);

  // Video & Playlist
  // const refreshVideos = useVideoStore((state) => state.refreshVideos);

  // Refresh Progress UI
  const { startRefresh, finishRefresh } = useRefreshStore();

  /**
   * Effect 2: 全局事件监听 (快捷键 & 刷新)
   */
  useEffect(() => {
    // 定义要注册的动作映射
    const navHandlers = {
      list_history: () => setView('history'),
      list_newest: () => setView('newest'),
      list_search: () => setView('search'),
      list_liked: () => setView('liked'),
      list_elite: () => setView('elite'),
      back_to_player: () => setView('player'),
      open_settings: () => setView('settings'),
      open_video_dir: () => {
        window.api.openVideoSourceDir().then(res => {
          if (!res.success) console.error('无法打开目录:', res.error);
        });
      },
    };

    // 1. 使用批量注册
    keyBindingManager.registerHandlers(navHandlers);

    return () => {
      // 2. 建议注销特定的处理器，而不是 clearHandlers()
      // 这样可以避免在复杂的组件树中意外删掉其他地方注册的快捷键
      keyBindingManager.unregisterHandlers(Object.keys(navHandlers) as AppAction[]);
    };
  }, [setView, startRefresh, finishRefresh]);

  // 渲染逻辑
  const renderView = () => {
    switch (currentView) {
      case 'player': return <VideoPlayer />;
      case 'history': return <HistoryPage />;
      case 'newest': return <NewestPage />;
      // case 'search': return <SearchPage />;
      // case 'liked': return <LikedPage />;
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