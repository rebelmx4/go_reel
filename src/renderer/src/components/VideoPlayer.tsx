import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { Box } from '@mantine/core';
import { usePlayerStore, useScreenshotStore, usePlaylistStore, useVideoStore, useNavigationStore, useToastStore } from '../stores';
import { VideoContext } from '../contexts';
import { captureRotatedScreenshot } from '../utils';
import { AssignTagDialog } from './Dialog/AssignTagDialog';
import { CreateTagDialog } from './Dialog/CreateTagDialog';
import { PlayerControls } from './PlayerControls';
import { useScreenshotExport } from '../hooks/useScreenshotExport'; // 引入 Hook
import { ExportScreenshotDialog } from './Dialog/ExportScreenshotDialog';

export interface VideoPlayerRef {
    videoElement: HTMLVideoElement | null;
}

(function () {
    const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    const origSet = desc!.set!;

    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        ...desc,
        set(val) {
            console.trace('[currentTime hooked] 被设成', val);
            return origSet.call(this, val);
        },
    });

    const t = setInterval(() => {
        const vid = document.querySelector('video');
        if (!vid) return;
        clearInterval(t);

        new MutationObserver(() =>
            console.warn('[src changed] ->', vid.currentSrc)
        ).observe(vid, { attributeFilter: ['src'] });

        vid.addEventListener('loadstart', () =>
            console.warn('[loadstart fired]')
        );
    }, 10000);
})();

/**
 * Video Player Component
 * Advanced HTML5 video player with rotation, stepping, and keyboard controls
 */
export const VideoPlayer = forwardRef<VideoPlayerRef>((_props, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cropOverlayRef = useRef<HTMLDivElement>(null);

    const currentVideoPath = usePlayerStore((state) => state.currentVideoPath);
    const isPlaying = usePlayerStore((state) => state.isPlaying);
    const volume = usePlayerStore((state) => state.volume);

    const rotation = usePlayerStore((state) => state.rotation);
    const [visualRotation, setVisualRotation] = useState<number>(rotation);
    const prevRotationRef = useRef(rotation);

    const stepMode = usePlayerStore((state) => state.stepMode);
    const skipFrameMode = usePlayerStore((state) => state.skipFrameMode);
    const currentTime = usePlayerStore((state) => state.currentTime);
    const duration = usePlayerStore((state) => state.duration);
    const framerate = usePlayerStore((state) => state.framerate);

    const showToast = useToastStore((state) => state.showToast);

    const setPlaying = usePlayerStore((state) => state.setPlaying);
    const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
    const setDuration = usePlayerStore((state) => state.setDuration);
    const setRotation = usePlayerStore((state) => state.setRotation);
    const setFramerate = usePlayerStore((state) => state.setFramerate);

    const isCropMode = useScreenshotStore((state) => state.isCropMode);
    const setCropMode = useScreenshotStore((state) => state.setCropMode);
    const addScreenshot = useScreenshotStore((state) => state.addScreenshot);
    const setScreenshots = useScreenshotStore((state) => state.setScreenshots);
    const {
        showExportDialog,
        setShowExportDialog,
        exportRotationMetadata,
        currentHash
    } = useScreenshotExport(currentVideoPath, isCropMode, setCropMode);

    // Crop selection state
    const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
    const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Tag assignment dialog state
    const [showTagDialog, setShowTagDialog] = useState(false);
    const [currentVideoTags, setCurrentVideoTags] = useState<number[]>([]);

    // Tag creation dialog state
    const [showCreateTagDialog, setShowCreateTagDialog] = useState(false);
    const [tagCoverImage, setTagCoverImage] = useState('');
    const [isTagCreateMode, setIsTagCreateMode] = useState(false);

    // 【新增】状态1: 存储视频的原始宽高 (videoWidth, videoHeight)
    const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
    // 【新增】状态2: 存储视频容器的当前宽高
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

    // Expose video element to parent
    useImperativeHandle(ref, () => ({
        videoElement: videoRef.current
    }));

    // 【新增】效果1: 使用 ResizeObserver 监听容器尺寸变化，并更新状态
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            setContainerDimensions({
                width: container.offsetWidth,
                height: container.offsetHeight,
            });
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    // 【核心修正】彻底重写 calculateScale 函数
    const calculateScale = useCallback(() => {
        const cw = containerDimensions.width;
        const ch = containerDimensions.height;
        const vw = videoDimensions.width;
        const vh = videoDimensions.height;

        if (!cw || !ch || !vw || !vh) {
            return 1;
        }

        if (rotation % 180 === 0) {
            return 1;
        }

        const videoAspectRatio = vw / vh;
        const containerAspectRatio = cw / ch;

        let renderedVideoWidth, renderedVideoHeight;

        if (videoAspectRatio > containerAspectRatio) {
            renderedVideoWidth = cw;
            renderedVideoHeight = cw / videoAspectRatio;
        } else {
            renderedVideoHeight = ch;
            renderedVideoWidth = ch * videoAspectRatio;
        }

        const scale = Math.min(
            cw / renderedVideoHeight,
            ch / renderedVideoWidth
        );

        return scale;
    }, [rotation, videoDimensions, containerDimensions]);

    // 【修正】让 transform 效果依赖于所有相关尺寸的变化
    useEffect(() => {
        if (videoRef.current) {
            const scale = calculateScale();
            videoRef.current.style.transform = `rotate(${rotation}deg) scale(${scale})`;
        }
    }, [rotation, calculateScale, videoDimensions, containerDimensions]);

    // Update video source when path changes
    useEffect(() => {
        if (videoRef.current && currentVideoPath) {
            let normalizedPath = currentVideoPath.replace(/\\/g, '/');
            videoRef.current.src = `file://${normalizedPath}`;
            videoRef.current.load();

            const loadMetadata = async () => {
                try {
                    const metadata = await window.api.getVideoMetadata(currentVideoPath);
                    setFramerate(metadata.framerate);
                    console.log(`Video framerate: ${metadata.framerate} fps`);

                    const hash = await window.api.calculateVideoHash(currentVideoPath);
                    if (hash) {
                        const annotation = await window.api.getAnnotation(hash);
                        const savedRotation = annotation?.rotation ?? 0;
                        const rot = savedRotation as 0 | 90 | 180 | 270;
                        setRotation(rot);
                        setVisualRotation(rot);
                        prevRotationRef.current = rot;
                        console.log(`Loaded rotation from annotation: ${rot}°`);
                    }
                } catch (error) {
                    console.error("Failed to load video metadata:", error)
                }
            };
            loadMetadata();
        }
    }, [currentVideoPath, setFramerate, setRotation]);

    // Load video tags when video changes
    useEffect(() => {
        if (currentVideoPath && window.api?.loadVideoTags) {
            window.api.loadVideoTags(currentVideoPath).then(tagIds => {
                setCurrentVideoTags(tagIds);
            });
        }
    }, [currentVideoPath]);

    // Update playing state
    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.play().catch((error) => {
                    console.error('Failed to play video:', error);
                    setPlaying(false);
                });
            } else {
                videoRef.current.pause();
            }
        }
    }, [isPlaying, setPlaying]);

    // Update volume
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume / 100;
        }
    }, [volume]);

    // Handle video events
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    // 【修正】在视频元数据加载后，更新视频的原始尺寸状态
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setVideoDimensions({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
            });
        }
    };

    // Frame stepping function
    const stepFrame = useCallback((direction: number) => {
        if (!videoRef.current) return;
        const frameDuration = 1 / framerate;
        if (stepMode === 'frame' && framerate > 0) {
            videoRef.current.currentTime += direction * frameDuration;
        } else {
            videoRef.current.currentTime += direction * 1;
        }
    }, [stepMode, framerate]);

    // Rotate video by 90 degrees
    const rotateVideo = useCallback(async () => {
        const newRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
        setRotation(newRotation);

        if (currentVideoPath) {
            try {
                const hash = await window.api.calculateVideoHash(currentVideoPath);
                if (hash) {
                    await window.api.updateAnnotation(hash, { rotation: newRotation });
                }
            } catch (error) {
                console.error("Failed to save video rotation:", error);
            }
        }
    }, [rotation, setRotation, currentVideoPath]);

    // Toggle play/pause
    const togglePlayPause = useCallback(() => setPlaying(!isPlaying), [isPlaying, setPlaying]);

    const takeRawScreenshot = useCallback(async () => {
        if (!videoRef.current || !currentVideoPath) return;

        try {
            const video = videoRef.current;
            const currentTime = video.currentTime; // 获取当前时间（秒）

            const videoHash = await window.api.calculateVideoHash(currentVideoPath);
            if (!videoHash) throw new Error("Failed to calculate video hash");

            // 调用主进程在指定时间点截图
            const success = await window.api.saveManualScreenshot(videoHash, currentVideoPath, currentTime);

            if (success) {
                // 成功后，重新加载列表以更新UI
                const updatedScreenshots = await window.api.loadScreenshots(videoHash);
                setScreenshots(updatedScreenshots);
                showToast({ message: '截图成功', type: 'success' });
            } else {
                throw new Error("Main process failed to capture screenshot.");
            }

        } catch (error) {
            console.error('Failed to capture screenshot:', error);
            showToast({ message: '截图失败', type: 'error' });
        }
    }, [currentVideoPath, setScreenshots, showToast]);


    // 【修改】视频加载时的逻辑
    useEffect(() => {
        if (!currentVideoPath) return;

        const initializeScreenshots = async () => {
            // ▼▼▼ 使用新的 IPC 调用 ▼▼▼
            const videoHash = await window.api.calculateVideoHash(currentVideoPath);
            if (!videoHash) {
                console.error("Could not generate hash, aborting screenshot initialization.");
                return;
            }

            let existingScreenshots = await window.api.loadScreenshots(videoHash);

            if (existingScreenshots.length === 0) {
                showToast({ message: '正在生成预览截图...', type: 'info' });
                const success = await window.api.generateAutoScreenshots(videoHash, currentVideoPath);

                if (success) {
                    existingScreenshots = await window.api.loadScreenshots(videoHash);
                }
            }

            setScreenshots(existingScreenshots);
        };

        initializeScreenshots();

    }, [currentVideoPath]);

    // Handle crop mode mouse events
    const handleCropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isCropMode || !cropOverlayRef.current) return;
        const rect = cropOverlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCropStart({ x, y });
        setCropEnd({ x, y });
        setIsDragging(true);
    }, [isCropMode]);

    const handleCropMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !cropOverlayRef.current) return;
        const rect = cropOverlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCropEnd({ x, y });
    }, [isDragging]);

    const handleCropMouseUp = useCallback(() => {
        if (!isDragging || !cropStart || !cropEnd || !videoRef.current) {
            setIsDragging(false);
            return;
        }
        const width = Math.abs(cropEnd.x - cropStart.x);
        const height = Math.abs(cropEnd.y - cropStart.y);
        if (width < 10 || height < 10) {
            setIsDragging(false);
            setCropStart(null);
            setCropEnd(null);
            return;
        }
        try {
            const dataUrl = captureRotatedScreenshot(videoRef.current, rotation);
            if (isTagCreateMode) {
                setTagCoverImage(dataUrl);
                setShowCreateTagDialog(true);
                setIsTagCreateMode(false);
                setCropMode(false);
            } else {
                addScreenshot({
                    id: `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: videoRef.current.currentTime,
                    dataUrl,
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                    createdAt: Date.now()
                });
                setCropMode(false);
            }
        } catch (error) {
            console.error('Failed to capture cropped screenshot:', error);
        } finally {
            setIsDragging(false);
            setCropStart(null);
            setCropEnd(null);
        }
    }, [isDragging, cropStart, cropEnd, rotation, addScreenshot, setCropMode, isTagCreateMode]);

    // Play next video function
    const playNextVideo = useCallback(() => {
        const getNextVideo = usePlaylistStore.getState().getNextVideo;
        const setCurrentVideo = usePlayerStore.getState().setCurrentVideo;
        const updateLastPlayed = useVideoStore.getState().updateLastPlayed;
        const setView = useNavigationStore.getState().setView;
        const nextVideo = getNextVideo();
        if (nextVideo) {
            setCurrentVideo(nextVideo.path);
            updateLastPlayed(nextVideo.hash);
            usePlaylistStore.getState().setCurrentVideo(nextVideo.hash);
            setView('player');
        }
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            switch (e.key.toLowerCase()) {
                case ' ': e.preventDefault(); togglePlayPause(); break;
                case 'r': e.preventDefault(); rotateVideo(); break;
                case 'a': e.preventDefault(); stepFrame(-1); break;
                case 'd': e.preventDefault(); stepFrame(1); break;
                case 'e': e.preventDefault(); isCropMode ? setCropMode(false) : takeRawScreenshot(); break;
                case 'g': if (e.shiftKey) { e.preventDefault(); setShowTagDialog(true); } break;
                case 'pagedown': e.preventDefault(); playNextVideo(); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlayPause, rotateVideo, stepFrame, isCropMode, setCropMode, takeRawScreenshot, playNextVideo]);

    // VideoPlayer.tsx

    // ... (在其他 useEffect 附近添加)

    // ▼▼▼ 新增下面这个完整的 useEffect ▼▼▼
    // Sync visual rotation with the global rotation state for smooth animations
    useEffect(() => {
        const prevRotation = prevRotationRef.current;

        // Case 1: Standard rotation (e.g., 0 -> 90, 90 -> 180)
        if (rotation === prevRotation + 90) {
            setVisualRotation(visualRotation + 90);
        }
        // Case 2: The special case, 270 -> 0. We want to animate to 360.
        else if (rotation === 0 && prevRotation === 270) {
            setVisualRotation(visualRotation + 90);
        }
        // Case 3: Handle reverse rotation (e.g., 90 -> 0)
        else if (rotation === prevRotation - 90) {
            setVisualRotation(visualRotation - 90);
        }
        // Case 4: The special reverse case, 0 -> 270.
        else if (rotation === 270 && prevRotation === 0) {
            setVisualRotation(visualRotation - 90);
        }
        // Case 5: Fallback - if the rotation is set directly (e.g., loading a video)
        else {
            setVisualRotation(rotation);
        }

        // Update the ref for the next render
        prevRotationRef.current = rotation;

    }, [rotation]); // This effect ONLY runs when the global `rotation` changes

    useEffect(() => {
        if (videoRef.current) {
            const scale = calculateScale();
            // ▼▼▼ 把这里的 `rotation` ▼▼▼
            // videoRef.current.style.transform = `rotate(${rotation}deg) scale(${scale})`;

            // ▼▼▼ 修改为 `visualRotation` ▼▼▼
            videoRef.current.style.transform = `rotate(${visualRotation}deg) scale(${scale})`;
        }
    }, [visualRotation, calculateScale, videoDimensions, containerDimensions]);

    // Auto play next video when current video ends
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.addEventListener('ended', playNextVideo);
        return () => video.removeEventListener('ended', playNextVideo);
    }, [playNextVideo]);

    if (!currentVideoPath) {
        return (
            <VideoContext.Provider value={{ videoRef }}>
                <Box
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--mantine-color-dimmed)',
                    }}
                >
                    没有视频
                </Box>
            </VideoContext.Provider>
        );
    }

    return (
        <VideoContext.Provider value={{ videoRef }}>
            <Box
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#000',
                }}
            >
                <Box
                    ref={containerRef}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                        flex: 1,
                    }}
                >
                    <video
                        ref={videoRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            transformOrigin: 'center center',
                        }}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onDoubleClick={togglePlayPause}
                        onError={(e) => {
                            console.error('视频播放错误:', e);
                            const videoElement = e.target as HTMLVideoElement;
                            if (videoElement.error) {
                                console.error(`错误代码: ${videoElement.error.code}`);
                                console.error(`错误信息: ${videoElement.error.message}`);
                            }
                        }}
                    />

                    {/* {isCropMode && (
                        <Box
                            ref={cropOverlayRef}
                            onMouseDown={handleCropMouseDown}
                            onMouseMove={handleCropMouseMove}
                            onMouseUp={handleCropMouseUp}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                cursor: 'crosshair',
                                zIndex: 20,
                            }}
                        >
                            {cropStart && cropEnd && (
                                <Box
                                    style={{
                                        position: 'absolute',
                                        left: Math.min(cropStart.x, cropEnd.x),
                                        top: Math.min(cropStart.y, cropEnd.y),
                                        width: Math.abs(cropEnd.x - cropStart.x),
                                        height: Math.abs(cropEnd.y - cropStart.y),
                                        border: '2px dashed #00ff00',
                                        backgroundColor: 'rgba(0, 255, 0, 0.2)',
                                        pointerEvents: 'none',
                                    }}
                                />
                            )}
                        </Box>
                    )} */}
                </Box>

                <Box
                    style={{
                        width: '100%',
                        zIndex: 30,
                        flexShrink: 0,
                    }}
                >
                    <PlayerControls
                        videoRef={videoRef}
                        onScreenshot={() => {
                            if (isCropMode) {
                                setCropMode(false);
                            } else {
                                takeRawScreenshot();
                            }
                        }}
                        onNext={playNextVideo}
                        onRotate={rotateVideo}
                    />
                </Box>


                {/* 弹窗组件只需要传递最少的数据 */}
                <ExportScreenshotDialog
                    opened={showExportDialog}
                    onClose={() => setShowExportDialog(false)}
                    screenshots={useScreenshotStore.getState().screenshots}
                    videoHash={currentHash}
                    initialRotation={exportRotationMetadata}
                />

                <AssignTagDialog
                    opened={showTagDialog}
                    onClose={() => setShowTagDialog(false)}
                    assignedTagIds={currentVideoTags}
                    onAssign={async (tagIds) => {
                        if (window.api?.saveVideoTags && currentVideoPath) {
                            await window.api.saveVideoTags(currentVideoPath, tagIds);
                            setCurrentVideoTags(tagIds);
                        }
                    }}
                />

                <CreateTagDialog
                    opened={showCreateTagDialog}
                    onClose={() => {
                        setShowCreateTagDialog(false);
                        setTagCoverImage('');
                    }}
                    coverImage={tagCoverImage}
                    assignedTagIds={currentVideoTags}
                    onCreated={async (newTag) => {
                        if (window.api?.saveVideoTags && currentVideoPath) {
                            await window.api.saveVideoTags(currentVideoPath, [...currentVideoTags, newTag.id]);
                            setCurrentVideoTags([...currentVideoTags, newTag.id]);
                        }
                    }}
                />
            </Box>
        </VideoContext.Provider>
    );
});