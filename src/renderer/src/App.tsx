import { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { useNavigationStore, usePlayerStore, useRefreshStore } from './stores';
import { MainLayout, ToastContainer, PathConfigurationScreen, VideoPlayer } from './components';
import { TagSearchPage } from './pages/TagSearchPage';
import { RecentPage } from './pages/RecentPage';
import { NewestPage } from './pages/NewestPage';
import { SearchPage } from './pages/SearchPage';
import { LikedPage } from './pages/LikedPage';
import { ElitePage } from './pages/ElitePage';
import { RefreshLoadingScreen } from './components/RefreshLoadingScreen';
import { RecordingIndicator } from './components/RecordingIndicator';
import { keyBindingManager } from './utils';

function App() {
  const currentView = useNavigationStore((state) => state.currentView);
  const setView = useNavigationStore((state) => state.setView);
  const setCurrentVideo = usePlayerStore((state) => state.setCurrentVideo);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const setSkipFrameConfig = usePlayerStore((state) => state.setSkipFrameConfig);
  const setSkipDuration = usePlayerStore((state) => state.setSkipDuration);

  // Load startup result on mount
  useEffect(() => {
    const loadStartup = async () => {
      try {
        const result = await window.api.getStartupResult();

        if (result.needsConfiguration) {
          setView('configuration');
        } else {
          // Load initial video
          if (result.initialVideo) {
            setCurrentVideo(result.initialVideo.path);
          }

          // Restore volume
          if (result.volume !== undefined) {
            setVolume(result.volume);
          } else if (window.api?.loadVolume) {
            const savedVolume = await window.api.loadVolume();
            setVolume(savedVolume);
          }

          // Load settings (skip frame config)
          if (window.api?.loadSettings) {
            const settings = await window.api.loadSettings();
            if (settings.skip_frame) {
              setSkipFrameConfig(settings.skip_frame);
            }
            if (settings.skip_duration !== undefined) {
              setSkipDuration(settings.skip_duration);
            }
          }

          // Switch to player view
          setView('player');
        }
      } catch (error) {
        console.error('Failed to load startup result:', error);
        setView('configuration');
      }
    };

    loadStartup();
  }, [setView, setCurrentVideo, setVolume, setSkipFrameConfig, setSkipDuration]);

  // Initialize keyboard shortcuts
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

    // Register navigation handlers
    keyBindingManager.registerHandler('list_recent', () => setView('recent'));
    keyBindingManager.registerHandler('list_newest', () => setView('newest'));
    keyBindingManager.registerHandler('list_search', () => setView('search'));
    keyBindingManager.registerHandler('list_random', () => setView('random'));
    keyBindingManager.registerHandler('list_liked', () => setView('liked'));
    keyBindingManager.registerHandler('list_elite', () => setView('elite'));
    keyBindingManager.registerHandler('back_to_player', () => setView('player'));

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      keyBindingManager.clearHandlers();
    };
  }, [setView]);

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'configuration':
        return <PathConfigurationScreen />;
      case 'player':
        return <VideoPlayer />;
      case 'recent':
        return <RecentPage />;
      case 'newest':
        return <NewestPage />;
      case 'search':
        return <SearchPage />;
      case 'random':
        return <div style={{ padding: 20 }}>随机推荐 (待实现)</div>;
      case 'liked':
        return <LikedPage />;
      case 'elite':
        return <ElitePage />;
      case 'tag-search':
        return <TagSearchPage />;
      case 'settings':
        return <div style={{ padding: 20 }}>设置 (待实现)</div>;
      default:
        return <div style={{ padding: 20 }}>未知视图</div>;
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
