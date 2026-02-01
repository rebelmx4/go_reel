import { Group, ActionIcon, Tooltip, Box, Button, Slider, Menu } from '@mantine/core';
import {
    IconPlayerSkipForward, IconCamera, IconArrowRight,
    IconColumns3, IconTrash, IconRotateClockwise,
    IconStar, IconStarFilled, IconLayoutSidebarRightExpand, IconMagnet, IconPlayerSkipBack, IconTransform, IconTag,
    IconThumbDown, IconThumbUp
} from '@tabler/icons-react';
import {
    usePlayerStore,
    useVideoFileRegistryStore,
    usePlaylistStore,
} from '../stores';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ProgressBarWithThumbnail } from './ProgressBarWithThumbnail';
import { ScreenshotTrack } from './ScreenshotTrack';
import { keyBindingManager } from '../utils/KeyBindingManager';
import { PlaybackTimeLabel } from './PlaybackTimeLabel';
import { useVideoContext } from './contexts';
import { STEP_OPTIONS } from '../../../shared/constants';
import { formatPlaybackStep } from '../utils/format';
import { IconScissors } from '@tabler/icons-react';


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
    onScreenshot: () => void;
    onNext: () => void;
    onRotate: () => void;
    onDelete: () => void;
    onToggleFavorite: () => void;
    onHandleTranscode: () => void;
    onToggleLike: (isCtrl: boolean) => void; // <--- 新增这一行
}

export function PlayerControls({ onScreenshot, onNext, onRotate, onDelete, onToggleFavorite, onHandleTranscode, onToggleLike }: PlayerControlsProps) {
    const { videoRef } = useVideoContext();

    // --- 1. Store 数据订阅 ---
    // 状态值
    const volume = usePlayerStore(state => state.volume);
    const skipFrameMode = usePlayerStore(state => state.skipFrameMode);

    // 方法 (Actions 通常是静态的，不会触发重绘)
    const setVolume = usePlayerStore(state => state.setVolume);
    const setSkipFrameMode = usePlayerStore(state => state.setSkipFrameMode);
    const volumeUp = usePlayerStore(state => state.volumeUp);
    const volumeDown = usePlayerStore(state => state.volumeDown);
    const historyPaths = usePlaylistStore(state => state.historyPaths);
    const isHoverSeekMode = usePlayerStore(state => state.isHoverSeekMode);
    const setHoverSeekMode = usePlayerStore(state => state.setHoverSeekMode);
    const historyIndex = usePlaylistStore(state => state.historyIndex);
    const prev = usePlaylistStore(state => state.prev);

    const showClipTrack = usePlayerStore(state => state.showClipTrack);
    const toggleClipTrack = usePlayerStore(state => state.toggleClipTrack);

    const stepMode = usePlayerStore(state => state.stepMode);
    const setStepMode = usePlayerStore(state => state.setStepMode);

    const showSidebar = usePlayerStore(state => state.showSidebar);
    const toggleSidebar = usePlayerStore(state => state.toggleSidebar);

    const currentPath = usePlaylistStore(state => state.currentPath);

    const videoFile = useVideoFileRegistryStore(useCallback(state =>
        currentPath ? state.videos[currentPath] : null, [currentPath]
    ));

    const canPrev = historyIndex < historyPaths.length - 1;

    const showViewportTags = usePlayerStore(state => state.showViewportTags);
    const toggleViewportTags = usePlayerStore(state => state.toggleViewportTags);

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
        window.api.updatePreferenceSettings({ playback: { global_volume: volume } });
    }, 1000, [volume]);

    const getTooltipLabel = (baseLabel: string, action: string) => {
        const key = keyMap[action];
        return key ? `${baseLabel} (${key})` : baseLabel;
    };

    const duration = usePlayerStore(state => state.duration);
    const isSkipDisabled = duration < 60;


    // 找到点赞/喜欢按钮的位置
    const score = videoFile?.annotation?.like_count ?? 0;

    // 计算 UI 状态
    const displayScore = Math.floor(Math.abs(score)); // 取绝对值向下取整
    const isPositive = score > 0;
    const isNegative = score < 0;


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
                    <Tooltip label={isSkipDisabled ? "视频太短，无法跳帧" : (skipFrameMode ? "退出跳帧模式" : "进入跳帧模式")}>
                        <ActionIcon
                            variant={skipFrameMode && !isSkipDisabled ? "filled" : "subtle"}
                            color={skipFrameMode && !isSkipDisabled ? "blue" : "gray"}
                            onClick={() => setSkipFrameMode(!skipFrameMode)}
                            disabled={isSkipDisabled} // [新增]
                        >
                            {/* 如果禁用或关闭，显示右箭头；如果开启，显示切片图标 */}
                            {skipFrameMode && !isSkipDisabled ? <IconColumns3 size={20} /> : <IconArrowRight size={20} />}
                        </ActionIcon>
                    </Tooltip>

                    {/* 步进模式选择器 */}
                    <Menu shadow="md" width={100} position="top" withArrow>
                        <Menu.Target>
                            <Tooltip label="选择步进单位">
                                <Button
                                    variant="light"
                                    color="gray"
                                    size="compact-xs"
                                    style={{
                                        fontSize: '10px',
                                        minWidth: '40px',
                                        padding: '0 4px'
                                    }}
                                >
                                    {formatPlaybackStep(stepMode)}
                                </Button>
                            </Tooltip>
                        </Menu.Target>

                        <Menu.Dropdown style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                            <Menu.Label>步进单位</Menu.Label>
                            {STEP_OPTIONS.map((option) => (
                                <Menu.Item
                                    key={option}
                                    onClick={() => setStepMode(option)}
                                    style={{
                                        fontSize: '12px',
                                        color: stepMode === option ? '#228be6' : '#eee',
                                        backgroundColor: stepMode === option ? 'rgba(34, 139, 230, 0.1)' : 'transparent',
                                    }}
                                >
                                    {formatPlaybackStep(option)}
                                </Menu.Item>
                            ))}
                        </Menu.Dropdown>
                    </Menu>

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
                            color="red"
                            onClick={onDelete}
                        >
                            <IconTrash size={20} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={`点赞 (Ctrl+点击是不喜欢) | 当前分数: ${score.toFixed(1)}`}>
                        <ActionIcon
                            variant={score !== 0 ? "filled" : "subtle"}
                            color={isNegative ? "blue.8" : (isPositive ? "red.6" : "gray")}
                            onClick={(e) => onToggleLike(e.ctrlKey)}  // 传入是否按下了 Ctrl
                            style={{ position: 'relative' }}
                        >
                            {isNegative ? <IconThumbDown size={20} /> : <IconThumbUp size={20} />}

                            {/* 分数 Badge */}
                            {displayScore > 0 && (
                                <Box style={{
                                    position: 'absolute', top: -5, right: -5,
                                    backgroundColor: 'white', color: 'black',
                                    borderRadius: '10px', fontSize: '9px', padding: '0 4px',
                                    fontWeight: 'bold', border: '1px solid #ccc'
                                }}>
                                    {displayScore}
                                </Box>
                            )}
                        </ActionIcon>
                    </Tooltip>

                    <Tooltip label={getTooltipLabel(showClipTrack ? "关闭裁剪轨道" : "打开裁剪轨道", 'toggle_track')}>
                        <ActionIcon
                            variant={showClipTrack ? "filled" : "subtle"}
                            color={showClipTrack ? "blue" : "gray"}
                            onClick={toggleClipTrack}
                        >
                            <IconScissors size={20} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={isHoverSeekMode ? "关闭磁吸预览" : "开启磁吸预览 (鼠标跟随)"}>
                        <ActionIcon
                            variant={isHoverSeekMode ? "filled" : "subtle"}
                            color={isHoverSeekMode ? "orange" : "gray"}
                            onClick={() => setHoverSeekMode(!isHoverSeekMode)}
                        >
                            <IconMagnet size={20} />
                        </ActionIcon>
                    </Tooltip>
                    {/* [新增] 转码按钮 */}
                    <Tooltip label="兼容性转码 (修复无法播放或卡顿)">
                        <ActionIcon
                            variant="subtle"
                            color="orange" // 使用橙色表示这是“修复/转换”类操作
                            onClick={onHandleTranscode}
                            disabled={!currentPath}
                        >
                            <IconTransform size={20} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={showViewportTags ? "隐藏视口标签" : "显示视口标签"}>
                        <ActionIcon
                            variant={showViewportTags ? "filled" : "subtle"}
                            color={showViewportTags ? "blue" : "gray"}
                            onClick={toggleViewportTags}
                        >
                            <IconTag size={20} />
                        </ActionIcon>
                    </Tooltip>
                </Group>

                <Group gap="xl">
                    <Group gap="xs">
                        <Slider value={volume} onChange={setVolume} style={{ width: 100 }} size="xs" color="blue" />
                    </Group>

                    {/* 按钮组：上一个 和 下一个 */}
                    <Group gap={5}>
                        <Tooltip label="上一个 (历史回退)">
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="lg"
                                onClick={prev}
                                disabled={!canPrev} // 如果没有更旧的历史，禁用
                            >
                                <IconPlayerSkipBack size={22} />
                            </ActionIcon>
                        </Tooltip>

                        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onNext}>
                            <IconPlayerSkipForward size={22} />
                        </ActionIcon>
                    </Group>
                </Group>
            </Group>
        </Box>
    );
}