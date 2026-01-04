import { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

// 导入新的 Store 结构
import {
  useNavigationStore,
  useRefreshStore,
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
import { keyBindingManager } from './utils/KeyBindingManager';

function App() {
  // Navigation
  const currentView = useNavigationStore((state) => state.currentView);
  const setView = useNavigationStore((state) => state.setView);

  // Video & Playlist
  const refreshVideos = useVideoStore((state) => state.refreshVideos);

  // Refresh Progress UI
  const { startRefresh, finishRefresh } = useRefreshStore();

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