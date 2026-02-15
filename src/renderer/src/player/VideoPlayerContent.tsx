import { useEffect, useState } from 'react';
import { Box, Center, Text } from '@mantine/core';
import { IconClock, IconStar, IconHistory } from '@tabler/icons-react';
import { Stack, ActionIcon, Tooltip, rem } from '@mantine/core';
import { EliteSidebar } from './sidebars/EliteSidebar';
import { usePlayerStore, useScreenshotStore, usePlaylistStore, useClipStore } from '../stores';
import { useVideoAutoSkip } from './hooks/useVideoAutoSkip';

import { useVideoContext } from './contexts';
import { ClipTrack } from './ClipTrack';

// Sub-Components
import { PlayerControls } from './PlayerControls';
import { VideoViewport } from './VideoViewport';
import { PlayerModals } from './PlayerModals';
import { NewestSidebar } from './sidebars/NewestSidebar';

// Hooks
import { useVideoShortcuts, usePlayerActions, useVideoData } from './hooks';
import { useScreenshotExport } from '../hooks';
import { HistorySidebar } from './sidebars/HistorySidebar';
import { AssignTagSidebar } from './sidebars/AssignTagSidebar';
import { IconTags, IconFilter, IconArrowsLeftRight } from '@tabler/icons-react'; // 引入标签图标
import { TagFilterSidebar } from './sidebars/TagFilterSidebar';
import { TranscodeSidebar } from './sidebars/TranscodeSidebar';
import { IconHeart } from '@tabler/icons-react';
import { LikedSidebar } from './sidebars/LikedSidebar';


export const VideoPlayerContent = () => {
    const { videoRef } = useVideoContext();

    // --- 2. Store 数据订阅 (仅限主流程需要的) ---
    const currentPath = usePlaylistStore(state => state.currentPath);
    const playNext = usePlaylistStore(state => state.next);
    const {
        volume, rotation, showSidebar, sidebarTab,
        setCurrentTime, handleSidebarTabClick, modals,
        closeAssignTagModal,
        closeCreateTagModal,
        setTagCoverImage
    } = usePlayerStore();

    const initializeClips = useClipStore(state => state.initializeClips);
    const clearClips = useClipStore(state => state.clearClips);
    const duration = usePlayerStore(state => state.duration);

    const { loadScreenshots, clear } = useScreenshotStore();

    const showClipTrack = usePlayerStore(state => state.showClipTrack);
    // --- 4. 业务逻辑 Hooks ---

    // 处理截图导出弹窗逻辑
    const { showExportDialog, setShowExportDialog } = useScreenshotExport(currentPath);


    useVideoData();

    useVideoAutoSkip();

    // 音量物理控制
    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = volume / 100;
    }, [volume]);

    // 快捷键监听
    const actions = usePlayerActions();
    useVideoShortcuts({ ...actions });

    // 路径切换时的资源清理与加载
    useEffect(() => {
        if (!currentPath) {
            clear();
            return;
        }
        loadScreenshots(currentPath);
    }, [currentPath, loadScreenshots, clear]);

    // 自动播放下一个
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onEnded = () => playNext();
        v.addEventListener('ended', onEnded);
        return () => v.removeEventListener('ended', onEnded);
    }, [playNext]);

    useEffect(() => {
        if (!currentPath) {
            clearClips();
            return;
        }

        const loadVideoData = async () => {
            // 获取 Annotation 中的 clips
            const anno = await window.api.getAnnotation(currentPath);
            // 这里有个时序：需要等待 duration 获取到后再 initialize
            // 或者在 initializeClips 逻辑里处理
            if (duration > 0) {
                initializeClips(duration, anno?.clips);
            }
        };

        loadVideoData();
    }, [currentPath, duration, initializeClips, clearClips]);


    // --- 6. 渲染层 ---
    if (!currentPath) {
        return (
            <Center h="100%" bg="black">
                <Text c="dimmed">请从列表选择视频播放</Text>
            </Center>
        );
    }

    return (
        <Box style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', backgroundColor: '#000', overflow: 'hidden' }}>

            {/* 左侧：播放器主体（Viewport + Controls） */}
            <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%' }}>
                {/* 1. 视频视口层 */}
                <VideoViewport
                    videoSrc={`${currentPath}`}
                    onTimeUpdate={setCurrentTime}
                />

                {showClipTrack && (
                    <Box style={{ padding: '0 20px', backgroundColor: '#000', borderTop: '1px solid #333' }}>
                        <ClipTrack />
                    </Box>
                )}

                {/* 2. 底部控制栏 */}
                <Box style={{ width: '100%', zIndex: 30, flexShrink: 0 }}>
                    <PlayerControls
                        onScreenshot={actions.takeScreenshot}
                        onNext={playNext}
                        onRotate={actions.rotateVideo}
                        onDelete={actions.softDelete}
                        onToggleFavorite={actions.toggleFavorite}
                        onHandleTranscode={actions.handleTranscode}
                        onToggleLike={actions.handleLikeToggle}
                    />
                </Box>
            </Box>

            {/* 3. 右侧：侧边栏内容区 */}
            {showSidebar && (
                <Box style={{ height: '100%' }}>
                    {sidebarTab === 'newest' && <NewestSidebar />}
                    {sidebarTab === 'elite' && <EliteSidebar />}
                    {sidebarTab === 'history' && <HistorySidebar />}
                    {sidebarTab === 'assign_tag' && <AssignTagSidebar />}
                    {sidebarTab === 'tag_search' && <TagFilterSidebar />}
                    {sidebarTab === 'transcode' && <TranscodeSidebar />}
                    {sidebarTab === 'liked' && <LikedSidebar />}
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

                    <Tooltip label="播放历史" position="left" withArrow>
                        <ActionIcon
                            variant={showSidebar && sidebarTab === 'history' ? 'filled' : 'light'}
                            size="lg"
                            onClick={() => handleSidebarTabClick('history')}
                            color={showSidebar && sidebarTab === 'history' ? 'blue' : 'gray'}
                        >
                            <IconHistory style={{ width: rem(20), height: rem(20) }} />
                        </ActionIcon>
                    </Tooltip>

                    <Tooltip label="分配标签" position="left" withArrow>
                        <ActionIcon
                            variant={showSidebar && sidebarTab === 'assign_tag' ? 'filled' : 'light'}
                            size="lg"
                            onClick={() => handleSidebarTabClick('assign_tag')}
                            color={showSidebar && sidebarTab === 'assign_tag' ? 'blue' : 'gray'}
                        >
                            <IconTags style={{ width: rem(20), height: rem(20) }} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="按标签过滤" position="left" withArrow>
                        <ActionIcon
                            variant={showSidebar && sidebarTab === 'tag_search' ? 'filled' : 'light'}
                            size="lg"
                            onClick={() => handleSidebarTabClick('tag_search')}
                            color={showSidebar && sidebarTab === 'tag_search' ? 'blue' : 'gray'}
                        >
                            <IconFilter style={{ width: rem(20), height: rem(20) }} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="转码队列" position="left" withArrow>
                        <ActionIcon
                            variant={showSidebar && sidebarTab === 'transcode' ? 'filled' : 'light'}
                            size="lg"
                            onClick={() => handleSidebarTabClick('transcode')}
                            color={showSidebar && sidebarTab === 'transcode' ? 'blue' : 'gray'}
                        >
                            <IconArrowsLeftRight style={{ width: rem(20), height: rem(20) }} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="点赞/热度" position="left" withArrow>
                        <ActionIcon
                            variant={showSidebar && sidebarTab === 'liked' ? 'filled' : 'light'}
                            size="lg"
                            onClick={() => handleSidebarTabClick('liked')}
                            color={showSidebar && sidebarTab === 'liked' ? 'blue' : 'gray'}
                        >
                            <IconHeart style={{ width: rem(20), height: rem(20) }} />
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
                showTag={modals.isAssignTagOpen}
                setShowTag={(v) => !v && closeAssignTagModal()}

                // 2. 创建标签弹窗
                showCreateTag={modals.isCreateTagOpen}
                setShowCreateTag={(v) => !v && closeCreateTagModal()}

                // 3. 封面图数据
                tagCoverImage={modals.tagCoverImage}
                setTagCoverImage={setTagCoverImage}
            />
        </Box>
    );
};
