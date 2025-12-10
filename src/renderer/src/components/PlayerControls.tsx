import { Group, Text, ActionIcon, Tooltip, Box, Button } from '@mantine/core';
import {
    IconVolume,
    IconVolume2,
    IconVolume3,
    IconPlayerSkipForward,
    IconCamera,
    IconArrowRight,
    IconColumns3,
    IconScissors
} from '@tabler/icons-react';
import { usePlayerStore, useScreenshotStore } from '../stores';
import { RefObject, useEffect, useRef, useState } from 'react';
import { ProgressBarWithThumbnail } from './ProgressBarWithThumbnail';
import { Slider, Menu } from '@mantine/core';
import { ClipTrack } from './ClipTrack';
import { captureRawScreenshot } from '../utils';

interface PlayerControlsProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    onScreenshot: () => void;
    onNext: () => void;
    onRotate: () => void;
}

export function PlayerControls({ videoRef, onScreenshot, onNext, onRotate }: PlayerControlsProps) {
    const currentTime = usePlayerStore((state) => state.currentTime);
    const duration = usePlayerStore((state) => state.duration);
    const volume = usePlayerStore((state) => state.volume);
    const rotation = usePlayerStore((state) => state.rotation);
    const stepMode = usePlayerStore((state) => state.stepMode);
    const skipFrameMode = usePlayerStore((state) => state.skipFrameMode);
    const currentVideoPath = usePlayerStore((state) => state.currentVideoPath);

    const setVolume = usePlayerStore((state) => state.setVolume);
    const setRotation = usePlayerStore((state) => state.setRotation);
    const setStepMode = usePlayerStore((state) => state.setStepMode);
    const setSkipFrameMode = usePlayerStore((state) => state.setSkipFrameMode);

    const screenshots = useScreenshotStore((state) => state.screenshots);
    const setScreenshots = useScreenshotStore((state) => state.setScreenshots);
    const isCropMode = useScreenshotStore((state) => state.isCropMode);
    const setCropMode = useScreenshotStore((state) => state.setCropMode);

    // Format time as MM:SS
    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatMSTime = (timeInMS: number) => {
        return formatTime(timeInMS / 1000);
    }

    const handleSeek = (value: number) => {
        const v = videoRef.current;
        if (!v) return;

        v.currentTime = value;
    };

    const handleRotationClick = () => {
        // Reset to 0 on click
        setRotation(0);

        // Save rotation to persistence
        if (window.api?.saveVideoRotation && currentVideoPath) {
            window.api.saveVideoRotation(currentVideoPath, 0);
        }
    };

    const handleStepModeClick = () => {
        setStepMode(stepMode === 'frame' ? 'second' : 'frame');
    };

    const handleSkipFrameClick = () => {
        setSkipFrameMode(!skipFrameMode);
    };

    const handleCropModeClick = () => {
        setCropMode(!isCropMode);
    };

    // Save volume when it changes
    useEffect(() => {
        if (window.api?.saveVolume) {
            window.api.saveVolume(volume);
        }
    }, [volume]);

    const handleScreenshotClick = (timestampInMS: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = timestampInMS / 1000; // 转换为秒
        }
    };

    // Auto-generate 9 screenshots if none exist
    const trackRef = useRef<HTMLDivElement>(null);
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const scrollTimeoutRef = useRef<number>(0);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; screenshot: any } | null>(null);

    // Auto-scroll to active screenshot with debounce
    // useEffect(() => {
    //     if (!trackRef.current || screenshots.length === 0 || isUserScrolling) return;

    //     const activeScreenshot = screenshots.reduce((closest, s) => {
    //         const currentDiff = Math.abs(s.timestamp - currentTime);
    //         const closestDiff = Math.abs(closest.timestamp - currentTime);
    //         return currentDiff < closestDiff ? s : closest;
    //     });

    //     const activeElement = document.getElementById(`screenshot-${activeScreenshot.id}`);
    //     if (activeElement && trackRef.current) {
    //         const trackRect = trackRef.current.getBoundingClientRect();
    //         const elementRect = activeElement.getBoundingClientRect();
    //         const scrollLeft = activeElement.offsetLeft - (trackRect.width / 2) + (elementRect.width / 2);
    //         trackRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    //     }
    // }, [currentTime, screenshots, isUserScrolling]);

    // Handle user scrolling with 3-second debounce
    const handleTrackScroll = () => {
        setIsUserScrolling(true);

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false);
        }, 3000) as unknown as number;
    };

    const handleContextMenu = (e: React.MouseEvent, screenshot: any) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, screenshot });
    };

    const handleSetCover = () => {
        if (contextMenu) {
            // TODO: Implement set as cover
            console.log('Set as cover:', contextMenu.screenshot);
            setContextMenu(null);
        }
    };

    const handleDeleteScreenshot = async (e: React.MouseEvent, filename: string) => {
        e.stopPropagation(); // 防止触发跳转
        if (!currentVideoPath) return;

        try {
            const videoHash = await window.api.calculateVideoHash(currentVideoPath);
            if (!videoHash) throw new Error("Failed to get video hash for deletion.");

            await window.api.deleteScreenshot(videoHash, filename);

            // 操作成功后，从主进程重新加载列表以同步UI
            const updatedScreenshots = await window.api.loadScreenshots(videoHash);
            setScreenshots(updatedScreenshots);
        } catch (error) {
            console.error("Failed to delete screenshot:", error);
        }
    };

    return (
        <Box
            style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderTop: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
            }}
        >
            {/* Screenshot Track */}
            <Box
                style={{
                    height: 60,
                    backgroundColor: '#1a1a1a',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    border: '1px solid #333',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {screenshots.length === 0 ? (
                    <Text size="xs" c="dimmed" style={{ margin: '0 auto' }}>截图轨道 (按 E 键截图)</Text>
                ) : (
                    // 【修改5】重构截图列表的渲染逻辑
                    <Box style={{ display: 'flex', gap: 8, overflowX: 'auto', width: '100%', padding: '4px 0' }}>
                        {screenshots.map((screenshot) => (
                            <Tooltip
                                key={screenshot.filename} // 使用 filename 作为唯一 key
                                label={formatMSTime(screenshot.timestamp)}
                                position="top"
                            >
                                <Box
                                    onClick={() => handleScreenshotClick(screenshot.timestamp)}
                                    style={{
                                        position: 'relative',
                                        cursor: 'pointer',
                                        border: '2px solid #444',
                                        borderRadius: 6,
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        transition: 'all 0.2s',
                                        backgroundColor: '#1a1a1a',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#00ff00';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#444';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {/* Delete button */}
                                    <Box
                                        onClick={(e) => handleDeleteScreenshot(e, screenshot.filename)}
                                        style={{
                                            position: 'absolute',
                                            top: 2,
                                            right: 2,
                                            backgroundColor: 'rgba(255, 0, 0, 0.8)',
                                            color: '#fff',
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 10,
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            zIndex: 2,
                                            opacity: 0,
                                            transition: 'opacity 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 1)';
                                            e.currentTarget.style.opacity = '1';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
                                        }}
                                        className="screenshot-delete"
                                    >
                                        ×
                                    </Box>

                                    <img
                                        src={screenshot.path} // 使用 path 替代 dataUrl
                                        alt="Screenshot"
                                        style={{
                                            height: 60,
                                            width: 'auto',
                                            display: 'block'
                                        }}
                                    />
                                </Box>
                            </Tooltip>
                        ))}
                    </Box>
                )}
            </Box>
            {/* Add CSS for hover effect */}
            <style>{`
                .screenshot-delete {
                    opacity: 0;
                }
                .screenshot-delete:hover,
                *:hover > .screenshot-delete {
                    opacity: 1 !important;
                }
            `}</style>

            {/* Clip Track */}
            {/* <ClipTrack /> */}

            {/* Progress Bar with Thumbnail Preview */}
            <Group gap="xs" style={{ width: '100%' }}>
                <Text size="xs" c="dimmed" style={{ minWidth: 40 }}>{formatTime(currentTime)}</Text>
                <Box style={{ flex: 1 }}>
                    <ProgressBarWithThumbnail
                        currentTime={currentTime}
                        duration={duration}
                        videoPath={currentVideoPath}
                        onSeek={handleSeek}
                    />
                </Box>
                <Text size="xs" c="dimmed" style={{ minWidth: 40 }}>{formatTime(duration)}</Text>
            </Group>

            {/* Controls Row */}
            <Group justify="space-between">
                <Group>
                    {/* Skip Frame Mode */}
                    <Tooltip label={skipFrameMode ? "退出跳帧模式" : "进入跳帧模式"}>
                        <ActionIcon
                            variant={skipFrameMode ? "filled" : "subtle"}
                            color={skipFrameMode ? "blue" : "gray"}
                            onClick={handleSkipFrameClick}
                        >
                            {skipFrameMode ? <IconColumns3 size={20} /> : <IconArrowRight size={20} />}
                        </ActionIcon>
                    </Tooltip>

                    {/* Step Mode */}
                    <Tooltip label={`当前步进: ${stepMode === 'frame' ? '1帧' : '1秒'} (点击切换)`}>
                        <Button
                            variant="subtle"
                            color="gray"
                            size="xs"
                            onClick={handleStepModeClick}
                            style={{ width: 40, padding: 0 }}
                        >
                            {stepMode === 'frame' ? '帧' : '秒'}
                        </Button>
                    </Tooltip>

                    {/* Rotation */}
                    <Tooltip label="点击重置旋转 (快捷键: Alt+R 旋转90°)">
                        <Button
                            variant="subtle"
                            color="gray"
                            size="xs"
                            onClick={onRotate}
                            style={{ width: 40, padding: 0 }}
                        >
                            {rotation % 360}°
                        </Button>
                    </Tooltip>

                    {/* Screenshot */}
                    <Tooltip label="截图 (快捷键: E)">
                        <ActionIcon variant="subtle" color="gray" onClick={onScreenshot}>
                            <IconCamera size={20} />
                        </ActionIcon>
                    </Tooltip>

                    {/* Crop Mode */}
                    <Tooltip label={isCropMode ? "退出框选模式" : "框选截图"}>
                        <ActionIcon
                            variant={isCropMode ? "filled" : "subtle"}
                            color={isCropMode ? "green" : "gray"}
                            onClick={handleCropModeClick}
                        >
                            <IconScissors size={20} />
                        </ActionIcon>
                    </Tooltip>
                </Group>

                <Group>
                    {/* Volume */}
                    <Group gap={5}>
                        {volume === 0 ? <IconVolume3 size={18} /> : volume < 50 ? <IconVolume2 size={18} /> : <IconVolume size={18} />}
                        <Slider
                            value={volume}
                            onChange={setVolume}
                            style={{ width: 80 }}
                            size="xs"
                            color="gray"
                        />
                    </Group>

                    {/* Next Video */}
                    <Tooltip label="下一个视频 (PageDown)">
                        <ActionIcon variant="subtle" color="gray" onClick={onNext}>
                            <IconPlayerSkipForward size={20} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Box>
    );
}
