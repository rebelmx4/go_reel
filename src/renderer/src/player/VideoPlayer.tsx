import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Box, Center, Text } from '@mantine/core';
import { IconClock, IconStar } from '@tabler/icons-react';
import { Stack, ActionIcon, Tooltip, rem } from '@mantine/core';
import { EliteSidebar } from './sidebars/EliteSidebar';
// Stores & Context
import {
    usePlayerStore,
    useScreenshotStore,
    usePlaylistStore,
} from '../stores';
import { VideoContext } from '../contexts';

// Sub-Components
import { PlayerControls } from './PlayerControls';
import { VideoViewport } from './VideoViewport';
import { PlayerModals } from './PlayerModals';
import { NewestSidebar } from './sidebars/NewestSidebar';

// Hooks
import { useVideoShortcuts } from './hooks';
import { usePlayerActions } from './hooks/usePlayerActions'; // 建议放在 player/hooks 下
import { useScreenshotExport } from '../hooks';

export interface VideoPlayerRef {
    videoElement: HTMLVideoElement | null;
}

export const VideoPlayer = forwardRef<VideoPlayerRef>((_props, ref) => {
    // --- 1. Refs ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- 2. Store 数据订阅 (仅限主流程需要的) ---
    const currentPath = usePlaylistStore(state => state.currentPath);
    const playNext = usePlaylistStore(state => state.next);
    const {
        isPlaying, volume, rotation, showSidebar, sidebarTab,
        setPlaying, setCurrentTime, reset, toggleSidebar, handleSidebarTabClick
    } = usePlayerStore();

    const { loadScreenshots, clear } = useScreenshotStore();

    // --- 3. UI 局部状态 (弹窗控制) ---
    const [modals, setModals] = useState({
        tag: false,
        createTag: false,
        cover: ''
    });

    // --- 4. 业务逻辑 Hooks ---

    // 封装所有业务操作 (旋转、收藏、删除、截图)
    const actions = usePlayerActions(videoRef, {
        onOpenAssignTag: () => setModals(m => ({ ...m, tag: true })),
        onOpenCreateTag: (cover) => setModals(m => ({ ...m, createTag: true, cover: cover || '' }))
    });

    // 处理截图导出弹窗逻辑
    const { showExportDialog, setShowExportDialog } = useScreenshotExport(currentPath);

    // 暴露给父组件的 Ref
    useImperativeHandle(ref, () => ({ videoElement: videoRef.current }));

    // --- 5. 交互与副作用 ---

    // 物理播放控制 (确保 Store 状态与 HTMLVideoElement 同步)
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (isPlaying && v.paused) {
            v.play().catch(() => setPlaying(false));
        } else if (!isPlaying && !v.paused) {
            v.pause();
        }
    }, [isPlaying, setPlaying]);

    // 音量物理控制
    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = volume / 100;
    }, [volume]);

    // 快捷键监听

    useVideoShortcuts({
        ...actions, // 自动包含 togglePlayPause, rotateVideo, softDelete, toggleFavorite, takeScreenshot
        toggleSidebar: toggleSidebar,
        playNextVideo: playNext,
        stepFrame: (dir) => {
            if (videoRef.current) {
                const state = usePlayerStore.getState();
                const step = state.stepMode === 'frame' ? (1 / state.framerate) : 1;
                videoRef.current.currentTime += dir * step;
            }
        },
    });
    // 路径切换时的资源清理与加载
    useEffect(() => {
        if (!currentPath) {
            clear();
            return;
        }
        reset();
        loadScreenshots(currentPath);
    }, [currentPath, loadScreenshots, clear, reset]);

    // 自动播放下一个
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onEnded = () => playNext();
        v.addEventListener('ended', onEnded);
        return () => v.removeEventListener('ended', onEnded);
    }, [playNext]);

    // --- 6. 渲染层 ---

    if (!currentPath) {
        return (
            <Center h="100%" bg="black">
                <Text c="dimmed">请从列表选择视频播放</Text>
            </Center>
        );
    }

    return (
        <VideoContext.Provider value={{ videoRef }}>
            {/* [修改] 最外层改为 Row 布局，以容纳侧边栏 */}
            <Box style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', backgroundColor: '#000', overflow: 'hidden' }}>

                {/* 左侧：播放器主体（Viewport + Controls） */}
                <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%' }}>
                    {/* 1. 视频视口层 */}
                    <VideoViewport
                        videoRef={videoRef}
                        containerRef={containerRef}
                        videoSrc={`file://${currentPath.replace(/\\/g, '/')}`}
                        onTimeUpdate={setCurrentTime}
                    />

                    {/* 2. 底部控制栏 */}
                    <Box style={{ width: '100%', zIndex: 30, flexShrink: 0 }}>
                        <PlayerControls
                            videoRef={videoRef}
                            onScreenshot={actions.takeScreenshot}
                            onNext={playNext}
                            onRotate={actions.rotateVideo}
                            onDelete={actions.softDelete}
                            onToggleFavorite={actions.toggleFavorite}
                        />
                    </Box>
                </Box>



                {/* 3. 右侧：侧边栏内容区 */}
                {showSidebar && (
                    <Box style={{ height: '100%' }}>
                        {sidebarTab === 'newest' && <NewestSidebar />}
                        {sidebarTab === 'elite' && <EliteSidebar />}
                    </Box>
                )}

                {/* 2. 中间：侧边栏按钮控制条 (VS Code Style) */}
                <Box
                    style={{
                        width: rem(48),
                        height: '100%',
                        backgroundColor: 'var(--mantine-color-dark-8)',
                        borderLeft: '1px solid var(--mantine-color-dark-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingTop: rem(16),
                        zIndex: 40
                    }}
                >
                    <Stack gap="md">
                        {/* 最新视频按钮 */}
                        <Tooltip label="最新视频" position="left" withArrow>
                            <ActionIcon
                                variant={showSidebar && sidebarTab === 'newest' ? 'filled' : 'light'}
                                size="lg"
                                onClick={() => handleSidebarTabClick('newest')}
                                color={showSidebar && sidebarTab === 'newest' ? 'blue' : 'gray'}
                            >
                                <IconClock style={{ width: rem(20), height: rem(20) }} />
                            </ActionIcon>
                        </Tooltip>

                        {/* 精品视频按钮 */}
                        <Tooltip label="精品收藏" position="left" withArrow>
                            <ActionIcon
                                variant={showSidebar && sidebarTab === 'elite' ? 'filled' : 'light'}
                                size="lg"
                                onClick={() => handleSidebarTabClick('elite')}
                                color={showSidebar && sidebarTab === 'elite' ? 'blue' : 'gray'}
                            >
                                <IconStar style={{ width: rem(20), height: rem(20) }} />
                            </ActionIcon>
                        </Tooltip>
                    </Stack>
                </Box>

                {/* 3. 弹窗组件组（Portal 渲染，不影响布局） */}
                <PlayerModals
                    currentPath={currentPath}
                    rotation={rotation}
                    showExport={showExportDialog}
                    setShowExport={setShowExportDialog}
                    showTag={modals.tag}
                    setShowTag={(v) => setModals(m => ({ ...m, tag: v }))}
                    showCreateTag={modals.createTag}
                    setShowCreateTag={(v) => setModals(m => ({ ...m, createTag: v }))}
                    tagCoverImage={modals.cover}
                    setTagCoverImage={(v) => setModals(m => ({ ...m, cover: v }))}
                />
            </Box>
        </VideoContext.Provider>
    );
});