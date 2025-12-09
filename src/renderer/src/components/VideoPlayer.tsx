import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { Box } from '@mantine/core';
import { usePlayerStore, useScreenshotStore, usePlaylistStore, useVideoStore, useNavigationStore, useRecordingStore, useToastStore } from '../stores';
import { VideoContext } from '../contexts';
import { captureRawScreenshot, captureRotatedScreenshot } from '../utils';
import { AssignTagDialog } from './Dialog/AssignTagDialog';
import { CreateTagDialog } from './Dialog/CreateTagDialog';
import { PlayerControls } from './PlayerControls';

export interface VideoPlayerRef {
    videoElement: HTMLVideoElement | null;
}

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
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
    const stepMode = usePlayerStore((state) => state.stepMode);
    const skipFrameMode = usePlayerStore((state) => state.skipFrameMode);
    const currentTime = usePlayerStore((state) => state.currentTime);
    const duration = usePlayerStore((state) => state.duration);
    const framerate = usePlayerStore((state) => state.framerate);

    const isRecording = useRecordingStore((state) => state.isRecording);
    const startRecording = useRecordingStore((state) => state.startRecording);
    const stopRecording = useRecordingStore((state) => state.stopRecording);
    const cancelRecording = useRecordingStore((state) => state.cancelRecording);
    const savedPlayerState = useRecordingStore((state) => state.savedPlayerState);

    const showToast = useToastStore((state) => state.showToast);

    const setPlaying = usePlayerStore((state) => state.setPlaying);
    const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
    const setDuration = usePlayerStore((state) => state.setDuration);
    const setRotation = usePlayerStore((state) => state.setRotation);
    const setFramerate = usePlayerStore((state) => state.setFramerate);

    const isCropMode = useScreenshotStore((state) => state.isCropMode);
    const setCropMode = useScreenshotStore((state) => state.setCropMode);
    const addScreenshot = useScreenshotStore((state) => state.addScreenshot);

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

    // Expose video element to parent
    useImperativeHandle(ref, () => ({
        videoElement: videoRef.current
    }));

    // Calculate scale for rotation to fit container (from reference HTML)
    const calculateScale = useCallback(() => {
        if (!containerRef.current || !videoRef.current) return 1;

        const cw = containerRef.current.offsetWidth;
        const ch = containerRef.current.offsetHeight;

        // When rotated 90 or 270 degrees, swap dimensions
        if (rotation % 180 !== 0) {
            // Scale to fit the swapped dimensions
            return Math.min(cw / ch, ch / cw);
        }
        return 1;
    }, [rotation]);

    // Apply rotation transform
    useEffect(() => {
        if (videoRef.current) {
            const scale = calculateScale();
            videoRef.current.style.transform = `rotate(${rotation}deg) scale(${scale})`;
        }
    }, [rotation, calculateScale]);

    // Update video source when path changes
    useEffect(() => {
        if (videoRef.current && currentVideoPath) {
            // Use custom media protocol to bypass security restrictions
            // Ensure path is properly formatted for the media protocol
            let normalizedPath = currentVideoPath.replace(/\\/g, '/');

            // Ensure Windows drive letters are properly formatted
            // Convert E:\path or E:/path to E:/path format
            normalizedPath = normalizedPath.replace(/^([a-zA-Z]):\\/, '$1:/');

            videoRef.current.src = `file://${normalizedPath}`;
            videoRef.current.load();

            // Fetch video metadata including framerate
            if (window.api?.getVideoMetadata) {
                window.api.getVideoMetadata(currentVideoPath).then(metadata => {
                    setFramerate(metadata.framerate);
                    console.log(`Video framerate: ${metadata.framerate} fps`);
                });
            }

            // Load saved rotation angle
            if (window.api?.loadVideoRotation) {
                window.api.loadVideoRotation(currentVideoPath).then(savedRotation => {
                    setRotation(savedRotation as 0 | 90 | 180 | 270);
                    console.log(`Loaded rotation: ${savedRotation}°`);
                });
            }
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
    const handlePlay = () => {
        setPlaying(true);
    };

    const handlePause = () => {
        setPlaying(false);
    };

    const handleEnded = () => {
        setPlaying(false);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const skipFrameConfig = usePlayerStore((state) => state.skipFrameConfig);
    const skipDuration = usePlayerStore((state) => state.skipDuration);

    // Skip frame playback logic
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !skipFrameMode || !duration) return;

        // Calculate segments using config from store
        const { getSkipFrameSegments } = require('../utils/viewport');
        const numSegments = getSkipFrameSegments(duration, skipFrameConfig);

        if (!numSegments || numSegments === 0) return; // No skip frame for this duration

        // Calculate time points
        const interval = duration / numSegments;
        const segments: number[] = [];
        for (let i = 0; i < numSegments; i++) {
            segments.push(i * interval);
        }

        let currentSegmentIndex = 0;
        let pauseTimeout: NodeJS.Timeout | null = null;

        const handleTimeUpdate = () => {
            if (!video) return;

            const currentTime = video.currentTime;

            // Find current segment
            const segmentIndex = segments.findIndex((segmentTime, index) => {
                const nextSegmentTime = segments[index + 1] || duration;
                return currentTime >= segmentTime && currentTime < nextSegmentTime;
            });

            if (segmentIndex === -1) return;

            // If we've moved to a new segment
            if (segmentIndex !== currentSegmentIndex) {
                currentSegmentIndex = segmentIndex;

                // Seek to segment start
                video.currentTime = segments[segmentIndex];
                video.pause();

                // Clear any existing timeout
                if (pauseTimeout) {
                    clearTimeout(pauseTimeout);
                }

                // Resume after skip duration (from store)
                pauseTimeout = setTimeout(() => {
                    if (segmentIndex < segments.length - 1) {
                        video.currentTime = segments[segmentIndex + 1];
                        video.play();
                    }
                }, skipDuration * 1000);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            if (pauseTimeout) {
                clearTimeout(pauseTimeout);
            }
        };
    }, [skipFrameMode, duration, skipFrameConfig, skipDuration]);

    // Frame stepping function
    const stepFrame = useCallback((direction: number) => {
        if (!videoRef.current) return;

        if (stepMode === 'frame') {
            // Use actual framerate from video metadata (fetched via IPC)
            const frameDuration = 1 / framerate;
            videoRef.current.currentTime += direction * frameDuration;
        } else {
            // Step by 1 second
            videoRef.current.currentTime += direction * 1;
        }
    }, [stepMode, framerate]);

    // Rotate video by 90 degrees
    const rotateVideo = useCallback(() => {
        const newRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
        setRotation(newRotation);

        // Save rotation to persistence
        if (window.api?.saveVideoRotation && currentVideoPath) {
            window.api.saveVideoRotation(currentVideoPath, newRotation);
        }
    }, [rotation, setRotation, currentVideoPath]);

    // Toggle play/pause
    const togglePlayPause = useCallback(() => {
        setPlaying(!isPlaying);
    }, [isPlaying, setPlaying]);

    // Take raw screenshot (original video frame)
    const takeRawScreenshot = useCallback(() => {
        if (!videoRef.current) return;

        try {
            const dataUrl = captureRawScreenshot(videoRef.current);
            const timestamp = Math.floor(currentTime * 1000);
            addScreenshot({
                id: `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp,
                dataUrl,
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
                createdAt: Date.now()
            });
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
        }
    }, [currentTime, addScreenshot]);

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

        // Minimum crop size
        if (width < 10 || height < 10) {
            setIsDragging(false);
            setCropStart(null);
            setCropEnd(null);
            return;
        }

        try {
            // Capture screenshot
            const dataUrl = captureRotatedScreenshot(videoRef.current, rotation);

            if (isTagCreateMode) {
                // Tag creation mode: open CreateTagDialog with screenshot
                setTagCoverImage(dataUrl);
                setShowCreateTagDialog(true);
                setIsTagCreateMode(false);
                setCropMode(false);
            } else {
                // Normal screenshot mode: add to screenshot store
                const timestamp = Math.floor(currentTime * 1000);
                addScreenshot({
                    id: `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp,
                    dataUrl,
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                    createdAt: Date.now()
                });

                // Exit crop mode
                setCropMode(false);
            }
        } catch (error) {
            console.error('Failed to capture cropped screenshot:', error);
        } finally {
            setIsDragging(false);
            setCropStart(null);
            setCropEnd(null);
        }
    }, [isDragging, cropStart, cropEnd, rotation, currentTime, addScreenshot, setCropMode, isTagCreateMode]);

    // Play next video function
    const playNextVideo = useCallback(() => {
        const getNextVideo = usePlaylistStore.getState().getNextVideo;
        const setCurrentVideo = usePlayerStore.getState().setCurrentVideo;
        const updateLastPlayed = useVideoStore.getState().updateLastPlayed;
        const setView = useNavigationStore.getState().setView;

        const nextVideo = getNextVideo();
        if (nextVideo) {
            setCurrentVideo(nextVideo.path);
            updateLastPlayed(nextVideo.id);
            usePlaylistStore.getState().setCurrentVideo(nextVideo.id);
            setView('player');
        }
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input fields
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'r':
                    // Alt+R for rotation (as per requirements)
                    if (e.altKey) {
                        e.preventDefault();
                        rotateVideo();
                    }
                    break;
                case 'a':
                    e.preventDefault();
                    stepFrame(-1);
                    break;
                case 'd':
                    e.preventDefault();
                    stepFrame(1);
                    break;
                case 'e':
                    e.preventDefault();
                    if (isCropMode) {
                        setCropMode(false);
                    } else {
                        takeRawScreenshot();
                    }
                    break;
                case 'g':
                case 'G':
                    // Shift+G: Open tag assignment dialog
                    if (e.shiftKey) {
                        e.preventDefault();
                        setShowTagDialog(true);
                    }
                    break;
                case 'pagedown':
                    e.preventDefault();
                    playNextVideo();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlayPause, rotateVideo, stepFrame, isCropMode, setCropMode, takeRawScreenshot, playNextVideo]);

    // Auto play next video when current video ends
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            playNextVideo();
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
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
                ref={containerRef}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    backgroundColor: '#000',
                    overflow: 'hidden',
                    position: 'relative',
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
                    onEnded={handleEnded}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onError={(e) => {
                        console.error('视频播放错误:', e);
                        const videoElement = e.target as HTMLVideoElement;
                        if (videoElement.error) {
                            // MediaError 对象包含更多信息
                            console.error(`错误代码: ${videoElement.error.code}`);
                            console.error(`错误信息: ${videoElement.error.message}`);
                        }
                    }}
                />

                {/* Crop overlay */}
                {isCropMode && (
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
                        {/* Selection box */}
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
                )}

                <Box
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        zIndex: 30, // 确保层级高于视频和裁剪层(20)
                        transition: 'opacity 0.3s', // 可选：添加淡入淡出效果
                    }}
                // 可选：鼠标移出播放器区域时隐藏控制器
                // onMouseEnter={() => setShowControls(true)}
                // onMouseLeave={() => isPlaying && setShowControls(false)}
                >
                    <PlayerControls
                        videoRef={videoRef}
                        onScreenshot={() => {
                            // 复用 'e' 键的逻辑：如果是裁剪模式则退出，否则截图
                            if (isCropMode) {
                                setCropMode(false);
                            } else {
                                takeRawScreenshot();
                            }
                        }}
                        onNext={playNextVideo}
                    />
                </Box>

                {/* Tag Assignment Dialog */}
                <AssignTagDialog
                    opened={showTagDialog}
                    onClose={() => setShowTagDialog(false)}
                    assignedTagIds={currentVideoTags}
                    onAssign={async (tagIds) => {
                        // Save video tags
                        if (window.api?.saveVideoTags && currentVideoPath) {
                            await window.api.saveVideoTags(currentVideoPath, tagIds);
                            setCurrentVideoTags(tagIds);
                        }
                    }}
                />

                {/* Tag Creation Dialog */}
                <CreateTagDialog
                    opened={showCreateTagDialog}
                    onClose={() => {
                        setShowCreateTagDialog(false);
                        setTagCoverImage('');
                    }}
                    coverImage={tagCoverImage}
                    assignedTagIds={currentVideoTags}
                    onCreated={async (newTag) => {
                        // Auto-assign to current video
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
