// src/components/player/PlayerControls.tsx

import { Group, ActionIcon, Tooltip, Box, Button, Slider } from '@mantine/core';
import {
    IconPlayerSkipForward, IconCamera, IconArrowRight,
    IconColumns3, IconTrash, IconRotateClockwise,
    IconStar, IconStarFilled, IconLayoutSidebarRightExpand,
} from '@tabler/icons-react';
import {
    usePlayerStore,
    useScreenshotStore,
    useVideoFileRegistryStore,
    usePlaylistStore,
} from '../stores';
import { RefObject, useEffect, useState, useRef, useCallback } from 'react';
import { ProgressBarWithThumbnail } from './ProgressBarWithThumbnail';
import { ScreenshotTrack } from './ScreenshotTrack';
import { keyBindingManager } from '../utils/KeyBindingManager';
import { PlaybackTimeLabel } from './PlaybackTimeLabel';

/**
 * 防抖 Hook 用于持久化设置
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
    onDelete: () => void;
    onToggleFavorite: () => void;
}

export function PlayerControls({ videoRef, onScreenshot, onNext, onRotate, onDelete, onToggleFavorite }: PlayerControlsProps) {
    // --- 1. Store 数据订阅 ---
    // 状态值
    const volume = usePlayerStore(state => state.volume);
    const stepMode = usePlayerStore(state => state.stepMode);
    const skipFrameMode = usePlayerStore(state => state.skipFrameMode);

    // 方法 (Actions 通常是静态的，不会触发重绘)
    const setVolume = usePlayerStore(state => state.setVolume);
    const setStepMode = usePlayerStore(state => state.setStepMode);
    const setSkipFrameMode = usePlayerStore(state => state.setSkipFrameMode);
    const volumeUp = usePlayerStore(state => state.volumeUp);
    const volumeDown = usePlayerStore(state => state.volumeDown);

    const showSidebar = usePlayerStore(state => state.showSidebar);
    const toggleSidebar = usePlayerStore(state => state.toggleSidebar);

    const currentPath = usePlaylistStore(state => state.currentPath);

    const videoFile = useVideoFileRegistryStore(useCallback(state =>
        currentPath ? state.videos[currentPath] : null, [currentPath]
    ));


    // --- 2. 状态派生 (不再需要 useState) ---
    const isFavorite = videoFile?.annotation?.is_favorite || false;
    const [keyMap, setKeyMap] = useState<Record<string, string>>({});

    // 加载快捷键配置 (逻辑不变)
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

    const handleSeek = (value: number) => {
        if (videoRef.current) videoRef.current.currentTime = value;
    };

    const handleScreenshotSeek = (timestampInMs: number) => {
        if (videoRef.current) videoRef.current.currentTime = timestampInMs / 1000;
    };

    // 持久化音量
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
            <ScreenshotTrack onScreenshotClick={handleScreenshotSeek} />

            <Group gap="xs" style={{ width: '100%' }}>
                <Box style={{ flex: 1 }}>
                    <ProgressBarWithThumbnail
                        videoPath={currentPath || ''}
                        onSeek={handleSeek}
                    />
                </Box>
                <PlaybackTimeLabel />
            </Group>

            <Group justify="space-between">
                <Group gap="sm">
                    <Tooltip label={getTooltipLabel(showSidebar ? "关闭侧边栏" : "打开侧边栏", 'toggle_sidebar')}>
                        <ActionIcon
                            variant={showSidebar ? "filled" : "subtle"}
                            color={showSidebar ? "blue" : "gray"}
                            onClick={toggleSidebar}
                        >
                            <IconLayoutSidebarRightExpand size={20} />
                        </ActionIcon>
                    </Tooltip>

                    {/* 跳帧/步进 */}
                    <Tooltip label={getTooltipLabel(skipFrameMode ? "退出跳帧模式" : "进入跳帧模式", 'toggle_skip_frame_mode')}>
                        <ActionIcon
                            variant={skipFrameMode ? "filled" : "subtle"}
                            color={skipFrameMode ? "blue" : "gray"}
                            onClick={() => setSkipFrameMode(!skipFrameMode)}
                        >
                            {skipFrameMode ? <IconColumns3 size={20} /> : <IconArrowRight size={20} />}
                        </ActionIcon>
                    </Tooltip>

                    <Button
                        variant="light" color="gray" size="compact-xs"
                        onClick={() => setStepMode(stepMode === 'frame' ? 'second' : 'frame')}
                        style={{ fontSize: '10px' }}
                    >
                        {stepMode === 'frame' ? 'FRAME' : 'SEC'}
                    </Button>

                    {/* 旋转 */}
                    <Tooltip label={getTooltipLabel(`旋转视频`, 'rotate_video')}>
                        <ActionIcon variant="subtle" color="gray" onClick={onRotate}>
                            <IconRotateClockwise size={20} />
                        </ActionIcon>
                    </Tooltip>

                    {/* 截图 */}
                    <ActionIcon variant="subtle" color="gray" onClick={onScreenshot}>
                        <IconCamera size={20} />
                    </ActionIcon>

                    {/* 收藏按钮 - 响应式更新 */}
                    <Tooltip label={getTooltipLabel(isFavorite ? "移出精品" : "加入精品", 'toggle_favorite')}>
                        <ActionIcon
                            variant="subtle"
                            color={isFavorite ? "yellow" : "gray"}
                            onClick={onToggleFavorite}
                            disabled={!currentPath}
                        >
                            {isFavorite ? <IconStarFilled size={20} /> : <IconStar size={20} />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="软删除 (移动到回收站)">
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            color="red" // 使用红色表示危险操作
                            onClick={onDelete}
                        >
                            <IconTrash size={20} />
                        </ActionIcon>
                    </Tooltip>
                </Group>

                <Group gap="xl">
                    <Group gap="xs">
                        <Slider value={volume} onChange={setVolume} style={{ width: 100 }} size="xs" color="blue" />
                    </Group>
                    <ActionIcon variant="subtle" color="gray" size="lg" onClick={onNext}>
                        <IconPlayerSkipForward size={22} />
                    </ActionIcon>
                </Group>
            </Group>
        </Box>
    );
}