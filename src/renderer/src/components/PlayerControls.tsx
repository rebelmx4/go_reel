import { Group, Text, ActionIcon, Tooltip, Box, Button, Slider } from '@mantine/core';
import {
    IconVolume, IconVolume2, IconVolume3,
    IconPlayerSkipForward, IconCamera, IconArrowRight,
    IconColumns3, IconScissors, IconRotateClockwise,
    IconStar, IconStarFilled // 引入星星图标
} from '@tabler/icons-react';
import { usePlayerStore, useScreenshotStore, useVideoStore } from '../stores';
import { RefObject, useEffect, useState, useRef, useCallback } from 'react';
import { ProgressBarWithThumbnail } from './ProgressBarWithThumbnail';
import { ScreenshotTrack } from './ScreenshotTrack';
import { keyBindingManager } from '../utils/keyBindingManager';

/**
 * 自定义 Hook：实现防抖效果的 useEffect。
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
    // --- Store Hooks ---
    const {
        currentTime, duration, volume, rotation, stepMode, skipFrameMode, currentVideoPath,
        setVolume, setStepMode, setSkipFrameMode, stepForward, stepBackward, togglePlay
    } = usePlayerStore();

    const { isCropMode, setCropMode } = useScreenshotStore();

    // 获取当前视频对象以判断是否已收藏
    // 使用 useCallback 确保 selector 稳定性
    const currentVideo = useVideoStore(useCallback(state =>
        state.videos.find(v => v.path === currentVideoPath), [currentVideoPath]
    ));
    const toggleElite = useVideoStore(state => state.toggleElite);

    // 计算是否为精品
    const isFavorite = currentVideo?.elite || false;

    const [keyMap, setKeyMap] = useState<Record<string, string>>({});

    // 获取快捷键配置用于显示
    useEffect(() => {
        const bindings = keyBindingManager.getBindings();
        if (bindings) {
            const map: Record<string, string> = {};
            Object.values(bindings.global).forEach(group => {
                Object.entries(group).forEach(([action, key]) => {
                    map[action] = key;
                });
            });
            setKeyMap(map);
        }
    }, []);

    // 处理收藏切换
    const handleToggleFavorite = useCallback(async () => {
        // 1. 尝试从当前 store 对象中获取
        let targetHash: string | undefined | null = currentVideo?.hash;

        // 2. 如果对象不存在或没有 hash，但我们有文件路径，则尝试实时计算
        if (!targetHash && currentVideoPath) {
            try {
                // calculateVideoHash 返回 Promise<string | null>
                targetHash = await window.api.calculateVideoHash(currentVideoPath);
            } catch (error) {
                console.error("无法计算视频 Hash，无法收藏", error);
                return;
            }
        }

        // 3. 只有拿到了 hash 才能调用 toggle
        if (targetHash) {
            toggleElite(targetHash);
        } else {
            console.warn("无法获取视频标识，操作失败");
        }
    }, [currentVideo, currentVideoPath, toggleElite]);

    // 注册快捷键
    useEffect(() => {
        const handleVolumeUp = () => setVolume(v => v + 5);
        const handleVolumeDown = () => setVolume(v => v - 5);

        // 注册基础播放控制
        keyBindingManager.registerHandler('toggle_play', togglePlay);
        keyBindingManager.registerHandler('step_forward', stepForward);
        keyBindingManager.registerHandler('step_backward', stepBackward);
        keyBindingManager.registerHandler('volume_up', handleVolumeUp);
        keyBindingManager.registerHandler('volume_down', handleVolumeDown);
        keyBindingManager.registerHandler('rotate_video', onRotate);
        keyBindingManager.registerHandler('screenshot', onScreenshot);

        // 注册精品收藏快捷键 (Shift+F)
        // 注意：需确保 settingStore/keyBindingManager 中已预设了 'toggle_favorite' 的键位
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
    }, [onScreenshot, onRotate, setVolume, stepForward, stepBackward, togglePlay, handleToggleFavorite]);

    // 格式化时间
    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // 进度条拖拽
    const handleSeek = (value: number) => {
        if (videoRef.current) videoRef.current.currentTime = value;
    };

    // 截图点点击跳转
    const handleScreenshotSeek = (timestampInMS: number) => {
        if (videoRef.current) videoRef.current.currentTime = timestampInMS / 1000;
    };

    // 持久化音量设置
    useDebouncedEffect(() => {
        if (window.api?.updateSettings) {
            window.api.updateSettings({ playback: { global_volume: volume } });
        }
    }, 1000, [volume]);

    // 辅助函数：生成带快捷键提示的 Label
    const getTooltipLabel = (baseLabel: string, action: string) => {
        const key = keyMap[action];
        return key ? `${baseLabel} (${key})` : baseLabel;
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
            {/* 截图标记轨道 */}
            <ScreenshotTrack onScreenshotClick={handleScreenshotSeek} />

            {/* 进度条与时间 */}
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

            {/* 控制按钮栏 */}
            <Group justify="space-between">
                <Group>
                    {/* 1. 跳帧模式 */}
                    <Tooltip label={getTooltipLabel(skipFrameMode ? "退出跳帧模式" : "进入跳帧模式", 'toggle_skip_frame_mode')}>
                        <ActionIcon variant={skipFrameMode ? "filled" : "subtle"} color={skipFrameMode ? "blue" : "gray"} onClick={() => setSkipFrameMode(!skipFrameMode)}>
                            {skipFrameMode ? <IconColumns3 size={20} /> : <IconArrowRight size={20} />}
                        </ActionIcon>
                    </Tooltip>

                    {/* 2. 步进单位切换 */}
                    <Tooltip label={`当前步进: ${stepMode === 'frame' ? '1帧' : '1秒'} (点击切换)`}>
                        <Button variant="subtle" color="gray" size="xs" onClick={() => setStepMode(stepMode === 'frame' ? 'second' : 'frame')} style={{ width: 40, padding: 0 }}>
                            {stepMode === 'frame' ? '帧' : '秒'}
                        </Button>
                    </Tooltip>

                    {/* 3. 旋转 */}
                    <Tooltip label={getTooltipLabel(`旋转视频 (当前 ${rotation % 360}°)`, 'rotate_video')}>
                        <ActionIcon variant="subtle" color="gray" onClick={onRotate}>
                            <IconRotateClockwise size={20} />
                        </ActionIcon>
                    </Tooltip>

                    {/* 4. 普通截图 */}
                    <Tooltip label={getTooltipLabel("截图", 'screenshot')}>
                        <ActionIcon variant="subtle" color="gray" onClick={onScreenshot}>
                            <IconCamera size={20} />
                        </ActionIcon>
                    </Tooltip>

                    {/* 5. 框选截图 */}
                    <Tooltip label={getTooltipLabel(isCropMode ? "退出框选模式" : "框选截图", 'toggle_crop_mode')}>
                        <ActionIcon variant={isCropMode ? "filled" : "subtle"} color={isCropMode ? "green" : "gray"} onClick={() => setCropMode(!isCropMode)}>
                            <IconScissors size={20} />
                        </ActionIcon>
                    </Tooltip>

                    {/* 6. 精品收藏 (放置在框选截图之后) */}
                    <Tooltip label={getTooltipLabel(isFavorite ? "移出精品" : "加入精品", 'toggle_favorite')}>
                        <ActionIcon
                            variant="subtle"
                            color={isFavorite ? "yellow" : "gray"}
                            onClick={handleToggleFavorite}
                            disabled={!currentVideoPath} // 无视频时禁用
                        >
                            {isFavorite ? <IconStarFilled size={20} /> : <IconStar size={20} />}
                        </ActionIcon>
                    </Tooltip>
                </Group>

                {/* 右侧：音量与下一个视频 */}
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