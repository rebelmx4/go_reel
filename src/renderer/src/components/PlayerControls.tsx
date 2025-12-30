// src/components/player/PlayerControls.tsx

import { Group, Text, ActionIcon, Tooltip, Box, Button, Slider } from '@mantine/core';
import {
    IconVolume, IconVolume2, IconVolume3,
    IconPlayerSkipForward, IconCamera, IconArrowRight,
    IconColumns3, IconScissors, IconRotateClockwise,
    IconStar, IconStarFilled
} from '@tabler/icons-react';
import {
    usePlayerStore,
    useScreenshotStore,
    useVideoStore,
    usePlaylistStore,
    useToastStore
} from '../stores';
import { RefObject, useEffect, useState, useRef, useCallback } from 'react';
import { ProgressBarWithThumbnail } from './ProgressBarWithThumbnail';
import { ScreenshotTrack } from './ScreenshotTrack';
import { keyBindingManager } from '../utils/KeyBindingManager';

/**
 * 防抖 useEffect Hook
 */
function useDebouncedEffect(callback: () => void, delay: number, deps: React.DependencyList) {
    const timeoutRef = useRef<number | null>(null);
    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(callback, delay);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, deps);
}

interface PlayerControlsProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    onScreenshot: () => void;
    onNext: () => void;
    onRotate: () => void;
}

export function PlayerControls({ videoRef, onScreenshot, onNext, onRotate }: PlayerControlsProps) {
    // --- 1. Store 数据订阅 ---
    const {
        currentTime, duration, volume, rotation, stepMode, skipFrameMode,
        setVolume, setStepMode, setSkipFrameMode, stepForward, stepBackward, togglePlay
    } = usePlayerStore();

    // 从 PlaylistStore 获取当前路径
    const currentPath = usePlaylistStore(state => state.currentPath);

    // 从 VideoStore 获取当前视频的具体数据
    const videoData = useVideoStore(useCallback(state =>
        currentPath ? state.videos[currentPath] : null, [currentPath]
    ));
    const updateAnnotation = useVideoStore(state => state.updateAnnotation);

    const { isCropMode, setCropMode } = useScreenshotStore();
    const showToast = useToastStore(state => state.showToast);

    // --- 2. 状态计算 ---
    const isFavorite = videoData?.annotation?.is_favorite || false;
    const [keyMap, setKeyMap] = useState<Record<string, string>>({});

    // 加载快捷键配置
    useEffect(() => {
        const bindings = keyBindingManager.getBindings();
        if (bindings) {
            const map: Record<string, string> = {};
            Object.values(bindings.global).forEach(group => {
                Object.entries(group).forEach(([action, key]) => {
                    map[action] = key as string;
                });
            });
            setKeyMap(map);
        }
    }, []);

    // --- 3. 业务逻辑处理器 ---

    /**
     * 处理收藏切换
     * 前端不再关心 Hash，直接通过 Path 发起请求
     */
    const handleToggleFavorite = useCallback(async () => {
        if (!currentPath) return;

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
    }, [currentPath, isFavorite, updateAnnotation, showToast]);

    // 快捷键注册
    useEffect(() => {
        const handleVolumeUp = () => setVolume(volume + 5);
        const handleVolumeDown = () => setVolume(volume - 5);

        keyBindingManager.registerHandler('toggle_play', togglePlay);
        keyBindingManager.registerHandler('step_forward', stepForward);
        keyBindingManager.registerHandler('step_backward', stepBackward);
        keyBindingManager.registerHandler('volume_up', handleVolumeUp);
        keyBindingManager.registerHandler('volume_down', handleVolumeDown);
        keyBindingManager.registerHandler('rotate_video', onRotate);
        keyBindingManager.registerHandler('screenshot', onScreenshot);
        keyBindingManager.registerHandler('toggle_favorite', handleToggleFavorite);

        return () => {
            keyBindingManager.unregisterHandler('toggle_play');
            keyBindingManager.unregisterHandler('step_forward');
            keyBindingManager.unregisterHandler('step_backward');
            keyBindingManager.unregisterHandler('volume_up');
            keyBindingManager.unregisterHandler('volume_down');
            keyBindingManager.unregisterHandler('rotate_video');
            keyBindingManager.unregisterHandler('screenshot');
            keyBindingManager.unregisterHandler('toggle_favorite');
        };
    }, [onScreenshot, onRotate, setVolume, volume, stepForward, stepBackward, togglePlay, handleToggleFavorite]);

    // --- 4. 辅助函数 ---
    const formatTime = (timeInSeconds: number) => {
        const h = Math.floor(timeInSeconds / 3600);
        const m = Math.floor((timeInSeconds % 3600) / 60);
        const s = Math.floor(timeInSeconds % 60);
        return h > 0
            ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
            : `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSeek = (value: number) => {
        if (videoRef.current) videoRef.current.currentTime = value;
    };

    const handleScreenshotSeek = (timestampInMs: number) => {
        if (videoRef.current) videoRef.current.currentTime = timestampInMs / 1000;
    };

    // 持久化音量设置
    useDebouncedEffect(() => {
        window.api.updateSettings({ playback: { global_volume: volume } });
    }, 1000, [volume]);

    const getTooltipLabel = (baseLabel: string, action: string) => {
        const key = keyMap[action];
        return key ? `${baseLabel} (${key})` : baseLabel;
    };

    return (
        <Box
            style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                borderTop: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
            }}
        >
            {/* 截图轨道栏 */}
            <ScreenshotTrack onScreenshotClick={handleScreenshotSeek} />

            {/* 进度条与时间显示 */}
            <Group gap="xs" style={{ width: '100%' }}>
                <Text size="xs" c="dimmed" ff="monospace" style={{ minWidth: 45 }}>
                    {formatTime(currentTime)}
                </Text>
                <Box style={{ flex: 1 }}>
                    <ProgressBarWithThumbnail
                        currentTime={currentTime}
                        duration={duration}
                        videoPath={currentPath || ''}
                        onSeek={handleSeek}
                    />
                </Box>
                <Text size="xs" c="dimmed" ff="monospace" style={{ minWidth: 45 }}>
                    {formatTime(duration)}
                </Text>
            </Group>

            {/* 主按钮控制栏 */}
            <Group justify="space-between">
                <Group gap="sm">
                    {/* 跳帧/步进模式 */}
                    <Tooltip label={getTooltipLabel(skipFrameMode ? "退出跳帧模式" : "进入跳帧模式", 'toggle_skip_frame_mode')}>
                        <ActionIcon
                            variant={skipFrameMode ? "filled" : "subtle"}
                            color={skipFrameMode ? "blue" : "gray"}
                            onClick={() => setSkipFrameMode(!skipFrameMode)}
                        >
                            {skipFrameMode ? <IconColumns3 size={20} /> : <IconArrowRight size={20} />}
                        </ActionIcon>
                    </Tooltip>

                    <Tooltip label={`当前步进单位: ${stepMode === 'frame' ? '1帧' : '1秒'} (点击切换)`}>
                        <Button
                            variant="light"
                            color="gray"
                            size="compact-xs"
                            onClick={() => setStepMode(stepMode === 'frame' ? 'second' : 'frame')}
                            style={{ fontSize: '10px' }}
                        >
                            {stepMode === 'frame' ? 'FRAME' : 'SEC'}
                        </Button>
                    </Tooltip>

                    {/* 画面变换 */}
                    <Tooltip label={getTooltipLabel(`旋转视频 (当前 ${rotation % 360}°)`, 'rotate_video')}>
                        <ActionIcon variant="subtle" color="gray" onClick={onRotate}>
                            <IconRotateClockwise size={20} />
                        </ActionIcon>
                    </Tooltip>

                    {/* 截图功能组 */}
                    <Group gap={4}>
                        <Tooltip label={getTooltipLabel("普通截图", 'screenshot')}>
                            <ActionIcon variant="subtle" color="gray" onClick={onScreenshot}>
                                <IconCamera size={20} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label={getTooltipLabel(isCropMode ? "取消框选" : "框选截图", 'toggle_crop_mode')}>
                            <ActionIcon
                                variant={isCropMode ? "filled" : "subtle"}
                                color={isCropMode ? "green" : "gray"}
                                onClick={() => setCropMode(!isCropMode)}
                            >
                                <IconScissors size={20} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>

                    {/* 精品收藏 */}
                    <Tooltip label={getTooltipLabel(isFavorite ? "移出精品" : "加入精品", 'toggle_favorite')}>
                        <ActionIcon
                            variant="subtle"
                            color={isFavorite ? "yellow" : "gray"}
                            onClick={handleToggleFavorite}
                            disabled={!currentPath}
                        >
                            {isFavorite ? <IconStarFilled size={20} /> : <IconStar size={20} />}
                        </ActionIcon>
                    </Tooltip>
                </Group>

                {/* 右侧：音量与下一首 */}
                <Group gap="xl">
                    <Group gap="xs">
                        {volume === 0 ? <IconVolume3 size={18} /> : volume < 50 ? <IconVolume2 size={18} /> : <IconVolume size={18} />}
                        <Slider
                            value={volume}
                            onChange={setVolume}
                            style={{ width: 100 }}
                            size="xs"
                            color="blue"
                            label={(v) => `${v}%`}
                        />
                    </Group>

                    <Tooltip label={getTooltipLabel("下一个视频", 'play_next')}>
                        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onNext}>
                            <IconPlayerSkipForward size={22} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Box>
    );
}