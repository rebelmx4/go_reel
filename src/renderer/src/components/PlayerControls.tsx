import { Group, Text, ActionIcon, Tooltip, Box, Button, Slider } from '@mantine/core';
import {
    IconVolume, IconVolume2, IconVolume3,
    IconPlayerSkipForward, IconCamera, IconArrowRight,
    IconColumns3, IconScissors, IconRotateClockwise
} from '@tabler/icons-react';
import { usePlayerStore, useScreenshotStore } from '../stores';
import { RefObject, useEffect, useState, useRef } from 'react';
import { ProgressBarWithThumbnail } from './ProgressBarWithThumbnail';
import { ScreenshotTrack } from './ScreenshotTrack';
import { keyBindingManager } from '../utils/keyBindingManager';

/**
 * 自定义 Hook：实现防抖效果的 useEffect。
 * 只有当依赖项停止变化超过指定延迟时间后，回调函数才会执行。
 * @param callback 要执行的回调函数。
 * @param delay 延迟时间 (毫秒)。
 * @param deps useEffect 的依赖数组。
 */
function useDebouncedEffect(callback: () => void, delay: number, deps: React.DependencyList) {
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
            callback();
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}


interface PlayerControlsProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    onScreenshot: () => void;
    onNext: () => void;
    onRotate: () => void;
}

export function PlayerControls({ videoRef, onScreenshot, onNext, onRotate }: PlayerControlsProps) {
    // --- 状态与 Store ---
    const {
        currentTime, duration, volume, rotation, stepMode, skipFrameMode, currentVideoPath,
        setVolume, setRotation, setStepMode, setSkipFrameMode, stepForward, stepBackward, togglePlay
    } = usePlayerStore();

    const { isCropMode, setCropMode } = useScreenshotStore();
    const [keyMap, setKeyMap] = useState<Record<string, string>>({});

    // 组件挂载时，从管理器获取快捷键映射，用于 UI 显示
    useEffect(() => {
        const bindings = keyBindingManager.getBindings();
        if (bindings) {
            const map: Record<string, string> = {};
            // 将嵌套的快捷键对象扁平化为一个 action -> key 的映射
            Object.values(bindings.global).forEach(group => {
                Object.entries(group).forEach(([action, key]) => {
                    map[action] = key;
                });
            });
            setKeyMap(map);
        }
    }, []);

    // 注册和注销播放器相关的快捷键处理器
    useEffect(() => {
        // 定义快捷键对应的具体操作
        const handleVolumeUp = () => setVolume(v => v + 5);
        const handleVolumeDown = () => setVolume(v => v - 5);
        const handleRotate = () => onRotate();

        // 注册处理器
        keyBindingManager.registerHandler('toggle_play', togglePlay);
        keyBindingManager.registerHandler('step_forward', stepForward);
        keyBindingManager.registerHandler('step_backward', stepBackward);
        keyBindingManager.registerHandler('volume_up', handleVolumeUp);
        keyBindingManager.registerHandler('volume_down', handleVolumeDown);
        keyBindingManager.registerHandler('rotate_video', handleRotate);
        keyBindingManager.registerHandler('screenshot', onScreenshot);
        // 假设 'play_next' 是下一个视频的动作名 (需要在 settings 中定义)
        // keyBindingManager.registerHandler('play_next', onNext); 

        // 组件卸载时，清理注册的处理器
        return () => {
            keyBindingManager.unregisterHandler('toggle_play');
            keyBindingManager.unregisterHandler('step_forward');
            keyBindingManager.unregisterHandler('step_backward');
            keyBindingManager.unregisterHandler('volume_up');
            keyBindingManager.unregisterHandler('volume_down');
            keyBindingManager.unregisterHandler('rotate_video');
            keyBindingManager.unregisterHandler('screenshot');
            // keyBindingManager.unregisterHandler('play_next');
        };
    }, [onScreenshot, onNext, onRotate, setVolume, stepForward, stepBackward, togglePlay]);

    // 创建一个辅助函数来生成带快捷键的 Tooltip 标签
    const getTooltipLabel = (baseLabel: string, action: string) => {
        const key = keyMap[action];
        return key ? `${baseLabel} (${key})` : baseLabel;
    };

    // --- 渲染相关的函数 ---
    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (value: number) => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = value;
    };

    const handleScreenshotSeek = (timestampInMS: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = timestampInMS / 1000;
        }
    };

    // 使用新的通用 API 和防抖 Hook 来持久化音量
    useDebouncedEffect(() => {
        if (window.api?.updateSettings) {
            // 我们只更新 playback 对象下的 global_volume 字段
            window.api.updateSettings({
                playback: {
                    global_volume: volume
                }
            });
        }
    }, 1000, [volume]); // 仅当音量停止变化 1 秒后才保存

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
            <ScreenshotTrack onScreenshotClick={handleScreenshotSeek} />

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

            <Group justify="space-between">
                <Group>
                    {/* 更新所有 Tooltip 的 label 属性，使其动态化 */}
                    <Tooltip label={getTooltipLabel(skipFrameMode ? "退出跳帧模式" : "进入跳帧模式", 'toggle_skip_frame_mode')}>
                        <ActionIcon variant={skipFrameMode ? "filled" : "subtle"} color={skipFrameMode ? "blue" : "gray"} onClick={() => setSkipFrameMode(!skipFrameMode)}>
                            {skipFrameMode ? <IconColumns3 size={20} /> : <IconArrowRight size={20} />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={`当前步进: ${stepMode === 'frame' ? '1帧' : '1秒'} (点击切换)`}>
                        <Button variant="subtle" color="gray" size="xs" onClick={() => setStepMode(stepMode === 'frame' ? 'second' : 'frame')} style={{ width: 40, padding: 0 }}>
                            {stepMode === 'frame' ? '帧' : '秒'}
                        </Button>
                    </Tooltip>
                    <Tooltip label={getTooltipLabel(`旋转视频 (当前 ${rotation % 360}°)`, 'rotate_video')}>
                        <ActionIcon variant="subtle" color="gray" onClick={onRotate}>
                            <IconRotateClockwise size={20} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={getTooltipLabel("截图", 'screenshot')}>
                        <ActionIcon variant="subtle" color="gray" onClick={onScreenshot}>
                            <IconCamera size={20} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={getTooltipLabel(isCropMode ? "退出框选模式" : "框选截图", 'toggle_crop_mode')}>
                        <ActionIcon variant={isCropMode ? "filled" : "subtle"} color={isCropMode ? "green" : "gray"} onClick={() => setCropMode(!isCropMode)}>
                            <IconScissors size={20} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
                <Group>
                    <Group gap={5}>
                        {volume === 0 ? <IconVolume3 size={18} /> : volume < 50 ? <IconVolume2 size={18} /> : <IconVolume size={18} />}
                        <Slider value={volume} onChange={setVolume} style={{ width: 80 }} size="xs" color="gray" />
                    </Group>
                    <Tooltip label={getTooltipLabel("下一个视频", 'play_next')}>
                        <ActionIcon variant="subtle" color="gray" onClick={onNext}>
                            <IconPlayerSkipForward size={20} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Box>
    );
}