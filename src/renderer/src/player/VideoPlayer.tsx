// src/renderer/src/components/VideoPlayer.tsx

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { Box, Center, Text } from '@mantine/core';
import {
    usePlayerStore,
    useScreenshotStore,
    usePlaylistStore,
    useToastStore,
    useVideoFileRegistryStore, // 修改为 RegistryStore
} from '../stores';
import { VideoContext } from '../contexts';
import { AssignTagDialog } from '../components/Dialog/AssignTagDialog';
import { CreateTagDialog } from '../components/Dialog/CreateTagDialog';
import { PlayerControls } from './PlayerControls';
import { ExportScreenshotDialog } from '../components/Dialog/ExportScreenshotDialog';

// 引入重构后的 Hooks
import { useVideoVisuals } from '../hooks/useVideoVisuals';
import { useVideoData } from '../hooks/useVideoData';
import { useVideoShortcuts } from '../hooks/useVideoShortcuts';
import { useScreenshotExport } from '../hooks/useScreenshotExport';

export interface VideoPlayerRef {
    videoElement: HTMLVideoElement | null;
}

export const VideoPlayer = forwardRef<VideoPlayerRef>((_props, ref) => {
    // --- 1. Refs ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- 2. Store 数据订阅 ---

    // 导航状态
    const currentPath = usePlaylistStore(state => state.currentPath);
    const playNext = usePlaylistStore(state => state.next);

    // 档案数据 (从 Registry 获取)

    const updateAnnotation = useVideoFileRegistryStore(s => s.updateAnnotation);

    // 播放器物理状态
    const {
        isPlaying, volume, rotation,
        setPlaying, setCurrentTime, setDuration, setRotation, reset
    } = usePlayerStore();

    // 截图与全局 UI
    const { captureManual, isCropMode, setCropMode, loadScreenshots, clear } = useScreenshotStore();
    const showToast = useToastStore(state => state.showToast);

    // --- 3. UI 局部状态 (仅用于弹窗控制) ---
    const [showTagDialog, setShowTagDialog] = useState(false);
    const [showCreateTagDialog, setShowCreateTagDialog] = useState(false);
    const [tagCoverImage, setTagCoverImage] = useState('');

    // --- 4. Custom Hooks 缝合 ---

    // 同步档案数据 (FPS, 旋转同步等)
    const { videoFile: activeFile } = useVideoData(videoRef);

    // 处理视觉变换 (CSS Rotation/Scale)
    const { onVisualLoadedMetadata } = useVideoVisuals({
        videoRef,
        containerRef,
        rotation
    });

    // 处理截图导出逻辑
    const { showExportDialog, setShowExportDialog } = useScreenshotExport(currentPath);

    useImperativeHandle(ref, () => ({ videoElement: videoRef.current }));

    // --- 5. 核心交互逻辑 ---

    // 播放/暂停物理控制
    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.play().catch(() => setPlaying(false));
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying, setPlaying]);

    // 音量物理控制
    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = volume / 100;
    }, [volume]);

    // 旋转逻辑：更新物理状态的同时持久化到档案库
    const rotateVideo = useCallback(async () => {
        if (!currentPath) return;
        const newRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
        console.log("旋转" + newRotation)
        setRotation(newRotation); // 立即改变物理画面
        await updateAnnotation(currentPath, { rotation: newRotation }); // 异步存入档案
    }, [rotation, setRotation, currentPath, updateAnnotation]);

    // 截图执行
    const takeRawScreenshot = useCallback(async () => {
        if (!videoRef.current || !currentPath) return;
        const success = await captureManual(currentPath, videoRef.current.currentTime);
        if (success) showToast({ message: '截图成功', type: 'success' });
    }, [currentPath, captureManual, showToast]);

    const handleSoftDelete = useCallback(async () => {
        if (!currentPath) return;

        const success = await window.api.moveToTrash(currentPath);

        if (success) {
            showToast({ message: '文件已移至待删除队列', type: 'success' });
            playNext();
        } else {
            showToast({ message: '操作失败', type: 'error' });
        }
    }, [currentPath, playNext, showToast]);

    const handleToggleFavorite = useCallback(async () => {
        if (!currentPath) return;

        // 从当前的 activeFile（档案数据）中获取当前的收藏状态
        const isFavorite = activeFile?.annotation?.is_favorite || false;
        const newFavoriteState = !isFavorite;

        try {
            await updateAnnotation(currentPath, { is_favorite: newFavoriteState });
            showToast({
                message: newFavoriteState ? '已加入精品' : '已移出精品',
                type: 'success'
            });
        } catch (error) {
            showToast({ message: '操作失败', type: 'error' });
        }
    }, [currentPath, activeFile, updateAnnotation, showToast]);

    // 快捷键监听
    useVideoShortcuts({
        togglePlayPause: () => setPlaying(!isPlaying),
        rotateVideo,
        stepFrame: (dir) => {
            if (videoRef.current) {
                const step = usePlayerStore.getState().stepMode === 'frame'
                    ? (1 / usePlayerStore.getState().framerate) : 1;
                videoRef.current.currentTime += dir * step;
            }
        },
        takeScreenshot: () => isCropMode ? setCropMode(false) : takeRawScreenshot(),
        toggleTagDialog: () => setShowTagDialog(true),
        playNextVideo: () => playNext(),
        softDelete: handleSoftDelete,
        toggleFavorite: handleToggleFavorite
    });

    // --- 6. 生命周期与事件 ---

    // 路径切换时的副作用
    useEffect(() => {
        if (!currentPath) {
            clear();
            return;
        }
        reset(); // 先归零物理状态
        loadScreenshots(currentPath); // 加载该视频的截图列表
    }, [currentPath, loadScreenshots, clear, reset]);

    // 自动播放下一个
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onEnded = () => playNext();
        v.addEventListener('ended', onEnded);
        return () => v.removeEventListener('ended', onEnded);
    }, [playNext]);

    // 处理视频源路径 (Windows 兼容)
    const videoSrc = currentPath ? `file://${currentPath.replace(/\\/g, '/')}` : '';

    // --- 7. 渲染层 ---

    if (!currentPath) {
        return (
            <Center h="100%" bg="black">
                <Text c="dimmed">请从列表选择视频播放</Text>
            </Center>
        );
    }

    return (
        <VideoContext.Provider value={{ videoRef }}>
            <Box style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#000' }}>

                {/* 视频渲染区域 */}
                <Box
                    ref={containerRef}
                    style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        style={{
                            width: '100%', height: '100%', objectFit: 'contain',
                            transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            transformOrigin: 'center center'
                        }}
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                        onLoadedMetadata={() => {
                            setDuration(videoRef.current?.duration || 0);
                            onVisualLoadedMetadata();
                        }}
                        onDoubleClick={() => setPlaying(!isPlaying)}
                    />
                </Box>

                {/* 底部控制栏 */}
                <Box style={{ width: '100%', zIndex: 30, flexShrink: 0 }}>
                    <PlayerControls
                        videoRef={videoRef}
                        onScreenshot={() => isCropMode ? setCropMode(false) : takeRawScreenshot()}
                        onNext={() => playNext()}
                        onRotate={rotateVideo}
                        onDelete={handleSoftDelete}
                        onToggleFavorite={handleToggleFavorite}
                    />
                </Box>

                {/* 弹窗组件 - 数据全部直接来自档案库 */}
                <ExportScreenshotDialog
                    opened={showExportDialog}
                    onClose={() => setShowExportDialog(false)}
                    videoPath={currentPath}
                    defaultRotation={rotation}
                />

                <AssignTagDialog
                    opened={showTagDialog}
                    onClose={() => setShowTagDialog(false)}
                    assignedTagIds={activeFile?.annotation?.tags ?? []}
                    onAssign={async (ids) => {
                        await updateAnnotation(currentPath, { tags: ids });
                    }}
                />

                <CreateTagDialog
                    opened={showCreateTagDialog}
                    onClose={() => { setShowCreateTagDialog(false); setTagCoverImage(''); }}
                    coverImage={tagCoverImage}
                    assignedTagIds={activeFile?.annotation?.tags ?? []}
                    onCreated={async (tag) => {
                        const currentTags = activeFile?.annotation?.tags ?? [];
                        await updateAnnotation(currentPath, { tags: [...currentTags, tag.id] });
                    }}
                />
            </Box>
        </VideoContext.Provider>
    );
});