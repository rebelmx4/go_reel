import { useEffect, useState, useMemo } from 'react';
import { MantineProvider, Box } from '@mantine/core';
import '@mantine/core/styles.css';

// 1. Stores
import { useNavigationStore } from './stores';

// 2. Components & Layout
import { MainLayout, ToastContainer } from './components';
import { RefreshLoadingScreen } from './components/RefreshLoadingScreen';
import { RecordingIndicator } from './player/RecordingIndicator';

// 3. Pages & Player
import { VideoPlayer } from './player/VideoPlayer';
import {
  TagSearchPage,
  HistoryPage,
  NewestPage,
  ElitePage,
  SettingsPage,
  FolderPage,
  TagManagePage
} from './pages';

// 4. Utils
import { keyBindingManager } from './utils/KeyBindingManager';
import { AppAction } from '../../shared/settings.schema';

function App() {
  // --- Navigation & View State ---
  const currentView = useNavigationStore((state) => state.currentView);
  const setView = useNavigationStore((state) => state.setView);

  // 记录哪些页面已经被访问过（按需挂载）
  const [visitedViews, setVisitedViews] = useState<Set<string>>(new Set([currentView]));

  // 当视图切换时，将其标记为已访问
  useEffect(() => {
    setVisitedViews((prev) => {
      if (prev.has(currentView)) return prev;
      const next = new Set(prev);
      next.add(currentView);
      return next;
    });
  }, [currentView]);

  // --- 全局事件监听 ---
  useEffect(() => {
    const navHandlers = {
      history_page: () => setView('history_page'),
      newest_page: () => setView('newest_page'),
      search_page: () => setView('search_page'),
      tag_search_page: () => setView('tag_search_page'),
      liked_page: () => setView('liked_page'),
      elite_page: () => setView('elite_page'),
      player_page: () => setView('player_page'),
      settings_page: () => setView('settings_page'),
      folder_page: () => setView('folder_page'),
      tag_manage_page: () => setView('tag_manage_page'),
      open_video_dir: () => {
        window.api.openVideoSourceDir().then(res => {
          if (!res.success) console.error('无法打开目录:', res.error);
        });
      },
    };

    keyBindingManager.registerHandlers(navHandlers);
    return () => {
      keyBindingManager.unregisterHandlers(Object.keys(navHandlers) as AppAction[]);
    };
  }, [setView]);

  // --- 页面配置表 ---
  // 使用 useMemo 避免每次 App 重绘都生成新的对象引用
  const viewConfigs = useMemo(() => [
    { id: 'player_page', component: <VideoPlayer /> },
    { id: 'history_page', component: <HistoryPage /> },
    { id: 'newest_page', component: <NewestPage /> },
    { id: 'elite_page', component: <ElitePage /> },
    { id: 'tag_search_page', component: <TagSearchPage /> },
    { id: 'settings_page', component: <SettingsPage /> },
    { id: 'folder_page', component: <FolderPage /> },
    { id: 'tag_manage_page', component: <TagManagePage /> },

  ], []);

  return (
    <MantineProvider defaultColorScheme="dark">
      <MainLayout>
        {/* 
            核心渲染逻辑：
            遍历配置表，如果页面被访问过，则保留在 DOM 树中。
            通过 display 属性控制显示隐藏，从而保留组件状态（如视频进度、滚动位置）。
        */}
        {viewConfigs.map((view) => {
          const isVisited = visitedViews.has(view.id);
          const isActive = currentView === view.id;

          // 如果该视图从未被访问过，则完全不渲染，节省内存和初始化性能
          if (!isVisited) return null;

          return (
            <Box
              key={view.id}
              style={{
                display: isActive ? 'block' : 'none',
                height: '100%',
                width: '100%',
                overflow: 'hidden' // 确保各页面独立滚动
              }}
            >
              {view.component}
            </Box>
          );
        })}
      </MainLayout>

      {/* 全局 UI 组件 */}
      <ToastContainer />
      <RefreshLoadingScreen />
      <RecordingIndicator />
    </MantineProvider>
  );
}

export default App;