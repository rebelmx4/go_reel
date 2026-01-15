// src/renderer/src/player/VideoPlayer.tsx

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { Box, Center, Text } from '@mantine/core';

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
        isPlaying, volume, rotation,
        setPlaying, setCurrentTime, reset
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
    const actions = usePlayerActions(videoRef);

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
        playNextVideo: playNext,
        toggleTagDialog: () => setModals(m => ({ ...m, tag: true })),
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

    // 处理框选完成：记录截图并开启创建标签弹窗
    const handleCropComplete = useCallback((base64: string) => {
        setModals(m => ({ ...m, createTag: true, cover: base64 }));
    }, []);

    return (
        <VideoContext.Provider value={{ videoRef }}>
            <Box style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#000' }}>

                {/* 1. 视频视口层：负责画面渲染、视觉变换、框选手势 */}
                <VideoViewport
                    videoRef={videoRef}
                    containerRef={containerRef}
                    videoSrc={`file://${currentPath.replace(/\\/g, '/')}`}
                    onCropComplete={handleCropComplete}
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

                {/* 3. 弹窗组件组 */}
                <PlayerModals
                    currentPath={currentPath}
                    rotation={rotation}
                    // 导出弹窗
                    showExport={showExportDialog}
                    setShowExport={setShowExportDialog}
                    // 分配标签弹窗
                    showTag={modals.tag}
                    setShowTag={(v) => setModals(m => ({ ...m, tag: v }))}
                    // 创建标签弹窗
                    showCreateTag={modals.createTag}
                    setShowCreateTag={(v) => setModals(m => ({ ...m, createTag: v }))}
                    tagCoverImage={modals.cover}
                    setTagCoverImage={(v) => setModals(m => ({ ...m, cover: v }))}
                />
            </Box>
        </VideoContext.Provider>
    );
});