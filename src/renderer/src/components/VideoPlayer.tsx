// src/renderer/src/components/VideoPlayer.tsx

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { Box, Center, Text } from '@mantine/core';
import {
    usePlayerStore,
    useScreenshotStore,
    usePlaylistStore,
    useToastStore,
    useVideoStore
} from '../stores';
import { VideoContext } from '../contexts';
import { AssignTagDialog } from './Dialog/AssignTagDialog';
import { CreateTagDialog } from './Dialog/CreateTagDialog';
import { PlayerControls } from './PlayerControls';
import { ExportScreenshotDialog } from './Dialog/ExportScreenshotDialog';

// 引入拆分后的 Hooks
import { useVideoVisuals } from '../hooks/useVideoVisuals';
import { useVideoData } from '../hooks/useVideoData';
import { useVideoShortcuts } from '../hooks/useVideoShortcuts';

export interface VideoPlayerRef {
    videoElement: HTMLVideoElement | null;
}

/**
 * 修复 HTML5 Video currentTime 设置时的精度问题（Polyfill）
 */
(function () {
    const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    if (desc && desc.set) {
        const origSet = desc.set;
        Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
            ...desc,
            set(val) { return origSet.call(this, val); },
        });
    }
})();

export const VideoPlayer = forwardRef<VideoPlayerRef>((_props, ref) => {
    // 1. Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 2. Stores State
    // 从 PlaylistStore 获取当前路径
    const currentPath = usePlaylistStore((state) => state.currentPath);
    const { next: playNext } = usePlaylistStore();

    // 播放器物理状态
    const {
        isPlaying, volume, rotation,
        stepMode, framerate,
        setPlaying, setCurrentTime, setDuration, setRotation, reset: resetPlayer
    } = usePlayerStore();

    const showToast = useToastStore((state) => state.showToast);
    const updateVideoAnnotation = useVideoStore((state) => state.updateAnnotation);

    // 截图状态
    const {
        isCropMode, setCropMode, screenshots,
        loadScreenshots, captureManual, clear: clearScreenshots
    } = useScreenshotStore();

    // 3. UI State
    const [showTagDialog, setShowTagDialog] = useState(false);
    const [showCreateTagDialog, setShowCreateTagDialog] = useState(false);
    const [tagCoverImage, setTagCoverImage] = useState('');
    const [showExportDialog, setShowExportDialog] = useState(false);

    // 4. Custom Hooks Integration
    const { transform, onVisualLoadedMetadata } = useVideoVisuals({
        videoRef,
        containerRef,
        rotation
    });
    const { currentVideoTags, setCurrentVideoTags } = useVideoData(videoRef);

    useImperativeHandle(ref, () => ({ videoElement: videoRef.current }));

    // 5. 核心逻辑 (Actions)

    // 播放/暂停控制
    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.play().catch((e) => {
                console.error('Play failed:', e);
                setPlaying(false);
            });
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying, setPlaying]);

    // 音量控制
    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = volume / 100;
    }, [volume]);

    const togglePlayPause = useCallback(() => setPlaying(!isPlaying), [isPlaying, setPlaying]);

    // 旋转逻辑：现在直接使用 updateVideoAnnotation(path, ...)
    const rotateVideo = useCallback(async () => {
        if (!currentPath) return;
        const newRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
        setRotation(newRotation);
        // 后端 withHash 会自动处理哈希并持久化
        await updateVideoAnnotation(currentPath, { rotation: newRotation });
    }, [rotation, setRotation, currentPath, updateVideoAnnotation]);

    const stepFrame = useCallback((direction: number) => {
        if (!videoRef.current) return;
        const step = (stepMode === 'frame' && framerate > 0) ? (1 / framerate) : 1;
        videoRef.current.currentTime += direction * step;
    }, [stepMode, framerate]);

    // 截图逻辑：使用 Store 封装的 captureManual
    const takeRawScreenshot = useCallback(async () => {
        if (!videoRef.current || !currentPath) return;
        const success = await captureManual(currentPath, videoRef.current.currentTime);
        if (success) {
            showToast({ message: '截图成功', type: 'success' });
        }
    }, [currentPath, captureManual, showToast]);

    // 6. 快捷键集成
    useVideoShortcuts({
        togglePlayPause,
        rotateVideo,
        stepFrame,
        takeScreenshot: () => isCropMode ? setCropMode(false) : takeRawScreenshot(),
        toggleTagDialog: () => setShowTagDialog(true),
        playNextVideo: () => playNext(),
    });

    // 7. 事件处理
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            onVisualLoadedMetadata();
        }
    };

    // 路径切换时的副作用：加载截图、重置播放器状态
    useEffect(() => {
        if (!currentPath) {
            clearScreenshots();
            return;
        }
        resetPlayer(); // 重置进度和旋转
        loadScreenshots(currentPath); // 后端会自动处理 generateAuto
    }, [currentPath, loadScreenshots, clearScreenshots, resetPlayer]);

    // 自动播放下一个
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onEnded = () => playNext();
        v.addEventListener('ended', onEnded);
        return () => v.removeEventListener('ended', onEnded);
    }, [playNext]);


    // 8. 渲染逻辑
    if (!currentPath) {
        return (
            <VideoContext.Provider value={{ videoRef }}>
                <Center h="100%" bg="black">
                    <Text c="dimmed">请从列表选择视频播放</Text>
                </Center>
            </VideoContext.Provider>
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
                        src={`file://${currentPath}`}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transform: transform,
                            transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            transformOrigin: 'center center'
                        }}
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                        onLoadedMetadata={handleLoadedMetadata}
                        onDoubleClick={togglePlayPause}
                    />
                </Box>

                {/* 底部控制栏 */}
                <Box style={{ width: '100%', zIndex: 30, flexShrink: 0 }}>
                    <PlayerControls
                        videoRef={videoRef}
                        onScreenshot={() => isCropMode ? setCropMode(false) : takeRawScreenshot()}
                        onNext={() => playNext()}
                        onRotate={rotateVideo}
                    />
                </Box>

                {/* 弹窗组件 */}
                <ExportScreenshotDialog
                    opened={showExportDialog}
                    onClose={() => setShowExportDialog(false)}
                    screenshots={screenshots}
                    videoPath={currentPath} // 注意这里也改为传 Path
                    initialRotation={rotation}
                />

                <AssignTagDialog
                    opened={showTagDialog}
                    onClose={() => setShowTagDialog(false)}
                    assignedTagIds={currentVideoTags}
                    onAssign={async (ids) => {
                        await window.api.saveVideoTags(currentPath, ids);
                        setCurrentVideoTags(ids);
                    }}
                />

                <CreateTagDialog
                    opened={showCreateTagDialog}
                    onClose={() => { setShowCreateTagDialog(false); setTagCoverImage(''); }}
                    coverImage={tagCoverImage}
                    assignedTagIds={currentVideoTags}
                    onCreated={async (tag) => {
                        const newIds = [...currentVideoTags, tag.id];
                        await window.api.saveVideoTags(currentPath, newIds);
                        setCurrentVideoTags(newIds);
                    }}
                />
            </Box>
        </VideoContext.Provider>
    );
});