import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { Box } from '@mantine/core';
import { usePlayerStore, useScreenshotStore, usePlaylistStore, useNavigationStore, useToastStore } from '../stores';
import { VideoContext } from '../contexts';
import { AssignTagDialog } from './Dialog/AssignTagDialog';
import { CreateTagDialog } from './Dialog/CreateTagDialog';
import { PlayerControls } from './PlayerControls';
import { useScreenshotExport } from '../hooks/useScreenshotExport';
import { ExportScreenshotDialog } from './Dialog/ExportScreenshotDialog';

// 引入拆分后的 Hooks
import { useVideoVisuals } from '../hooks/useVideoVisuals';
import { useVideoData } from '../hooks/useVideoData';
import { useVideoShortcuts } from '../hooks/useVideoShortcuts';
import { captureRotatedScreenshot } from '../utils';

export interface VideoPlayerRef {
    videoElement: HTMLVideoElement | null;
}

// 这个全局副作用也可以移到单独的 utils/polyfill.ts 文件中并在入口引入
(function () {
    const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    const origSet = desc!.set!;
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        ...desc,
        set(val) { return origSet.call(this, val); },
    });
})();

export const VideoPlayer = forwardRef<VideoPlayerRef>((_props, ref) => {
    // 1. Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cropOverlayRef = useRef<HTMLDivElement>(null);

    // 2. Stores State
    const {
        currentVideoPath, isPlaying, volume, rotation,
        stepMode, framerate,
        setPlaying, setCurrentTime, setDuration, setRotation
    } = usePlayerStore(); // 建议在 store 里加个 selector 或者这样解构

    const showToast = useToastStore((state) => state.showToast);

    const isCropMode = useScreenshotStore((state) => state.isCropMode);
    const setCropMode = useScreenshotStore((state) => state.setCropMode);
    const setScreenshots = useScreenshotStore((state) => state.setScreenshots);

    // 3. UI State (Dialogs & Crop)
    const [showTagDialog, setShowTagDialog] = useState(false);
    const [showCreateTagDialog, setShowCreateTagDialog] = useState(false);
    const [tagCoverImage, setTagCoverImage] = useState('');
    const [isTagCreateMode, setIsTagCreateMode] = useState(false);
    const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
    const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // 4. Custom Hooks Integration

    // 视觉逻辑 (Rotate, Resize)
    const { onLoadedMetadata: onVisualLoadedMetadata } = useVideoVisuals({ videoRef, containerRef, rotation });

    // 数据逻辑 (Path change, Tags, History)
    const { currentVideoTags, setCurrentVideoTags } = useVideoData(videoRef);

    // 截图导出逻辑
    const {
        showExportDialog, setShowExportDialog, exportRotationMetadata, currentHash
    } = useScreenshotExport(currentVideoPath, isCropMode, setCropMode);

    // 5. Component Logic (Actions)

    useImperativeHandle(ref, () => ({ videoElement: videoRef.current }));

    // 播放/音量控制
    useEffect(() => {
        if (!videoRef.current) return;
        isPlaying ? videoRef.current.play().catch(e => { console.error(e); setPlaying(false); }) : videoRef.current.pause();
    }, [isPlaying, setPlaying]);

    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = volume / 100;
    }, [volume]);

    // 核心动作定义
    const togglePlayPause = useCallback(() => setPlaying(!isPlaying), [isPlaying, setPlaying]);

    const rotateVideo = useCallback(async () => {
        const newRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
        setRotation(newRotation);
        // 保存旋转角度到后端
        if (currentVideoPath) {
            const hash = await window.api.calculateVideoHash(currentVideoPath);
            if (hash) window.api.updateAnnotation(hash, { rotation: newRotation });
        }
    }, [rotation, setRotation, currentVideoPath]);

    const stepFrame = useCallback((direction: number) => {
        if (!videoRef.current) return;
        const step = (stepMode === 'frame' && framerate > 0) ? (1 / framerate) : 1;
        videoRef.current.currentTime += direction * step;
    }, [stepMode, framerate]);

    const playNextVideo = useCallback(() => {
        const nextVideo = usePlaylistStore.getState().getNextVideo();
        if (nextVideo) {
            usePlayerStore.getState().setCurrentVideo(nextVideo.path);
            usePlaylistStore.getState().setCurrentVideo(nextVideo.hash);
            useNavigationStore.getState().setView('player');
        }
    }, []);

    const takeRawScreenshot = useCallback(async () => {
        // ... (保持原有的截图逻辑，或移入 useVideoScreenshotLogic)
        if (!videoRef.current || !currentVideoPath) return;
        try {
            const hash = await window.api.calculateVideoHash(currentVideoPath);
            if (hash) {
                const success = await window.api.saveManualScreenshot(hash, currentVideoPath, videoRef.current.currentTime);
                if (success) {
                    const shots = await window.api.loadScreenshots(hash);
                    setScreenshots(shots);
                    showToast({ message: '截图成功', type: 'success' });
                }
            }
        } catch (e) { console.error(e); }
    }, [currentVideoPath, setScreenshots, showToast]);

    // 6. Shortcuts Hook
    useVideoShortcuts({
        togglePlayPause,
        rotateVideo,
        stepFrame,
        takeScreenshot: () => isCropMode ? setCropMode(false) : takeRawScreenshot(),
        toggleTagDialog: () => setShowTagDialog(true),
        playNextVideo
    });

    // 7. Event Handlers
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            onVisualLoadedMetadata(); // 通知视觉 Hook 更新尺寸
        }
    };

    // Auto load screenshots on path change
    useEffect(() => {
        if (!currentVideoPath) return;
        let isMounted = true;
        const initScreenshots = async () => {
            const hash = await window.api.calculateVideoHash(currentVideoPath);
            if (!hash || !isMounted) return;
            let shots = await window.api.loadScreenshots(hash);
            if (shots.length === 0) {
                await window.api.generateAutoScreenshots(hash, currentVideoPath);
                shots = await window.api.loadScreenshots(hash);
            }
            if (isMounted) setScreenshots(shots);
        };
        initScreenshots();
        return () => { isMounted = false; };
    }, [currentVideoPath, setScreenshots]);

    // Auto play next
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.addEventListener('ended', playNextVideo);
        return () => v.removeEventListener('ended', playNextVideo);
    }, [playNextVideo]);


    if (!currentVideoPath) {
        return <VideoContext.Provider value={{ videoRef }}><Box h="100%" c="dimmed" flex={1} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>没有视频</Box></VideoContext.Provider>;
    }

    return (
        <VideoContext.Provider value={{ videoRef }}>
            <Box style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#000' }}>
                <Box
                    ref={containerRef}
                    style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <video
                        ref={videoRef}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', transformOrigin: 'center center' }}
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                        onLoadedMetadata={handleLoadedMetadata}
                        onDoubleClick={togglePlayPause}
                    />
                    {/* Crop Overlay Logic ... */}
                </Box>

                <Box style={{ width: '100%', zIndex: 30, flexShrink: 0 }}>
                    <PlayerControls
                        videoRef={videoRef}
                        onScreenshot={() => isCropMode ? setCropMode(false) : takeRawScreenshot()}
                        onNext={playNextVideo}
                        onRotate={rotateVideo}
                    />
                </Box>

                {/* Dialogs */}
                <ExportScreenshotDialog opened={showExportDialog} onClose={() => setShowExportDialog(false)} screenshots={useScreenshotStore.getState().screenshots} videoHash={currentHash} initialRotation={exportRotationMetadata} />

                <AssignTagDialog
                    opened={showTagDialog}
                    onClose={() => setShowTagDialog(false)}
                    assignedTagIds={currentVideoTags}
                    onAssign={async (ids) => {
                        if (currentVideoPath) { await window.api.saveVideoTags(currentVideoPath, ids); setCurrentVideoTags(ids); }
                    }}
                />

                <CreateTagDialog
                    opened={showCreateTagDialog}
                    onClose={() => { setShowCreateTagDialog(false); setTagCoverImage(''); }}
                    coverImage={tagCoverImage}
                    assignedTagIds={currentVideoTags}
                    onCreated={async (tag) => {
                        if (currentVideoPath) {
                            const newIds = [...currentVideoTags, tag.id];
                            await window.api.saveVideoTags(currentVideoPath, newIds);
                            setCurrentVideoTags(newIds);
                        }
                    }}
                />
            </Box>
        </VideoContext.Provider>
    );
});