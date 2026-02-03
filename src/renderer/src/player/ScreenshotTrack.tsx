import { Box, Group, ActionIcon, Tooltip, Loader, Center, Collapse, UnstyledButton } from '@mantine/core';
import { IconLayoutGrid, IconLayoutNavbar, IconChevronUp, IconChevronDown, IconGripHorizontal } from '@tabler/icons-react';
import { usePlayerStore, useScreenshotStore, usePlaylistStore, useVideoFileRegistryStore } from '../stores';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { ScreenshotNavView } from './ScreenshotNavView';
import { ScreenshotGalleryView } from './ScreenshotGalleryView';
import { useClipStore } from '../stores/clipStore';
import { IconFilter, IconFilterOff } from '@tabler/icons-react';

export function ScreenshotTrack({ onScreenshotClick }: { onScreenshotClick: (ts: number) => void }) {
    const [viewMode, setViewMode] = useState<'nav' | 'preview'>('nav');
    const [opened, setOpened] = useState(true);
    const [filterMode, setFilterMode] = useState<'all' | 'nav'>('nav');

    // --- 新增：高度管理 ---
    const [trackHeight, setTrackHeight] = useState(130);
    const isResizing = useRef(false);

    const { screenshots, isLoading, loadScreenshotData, deleteScreenshot, setAsCover } = useScreenshotStore();
    const currentVideoPath = usePlaylistStore(state => state.currentPath);
    const rotation = usePlayerStore(state => state.rotation);
    const clips = useClipStore(state => state.clips);

    // 切换模式时自动调整默认高度
    useEffect(() => {
        setTrackHeight(viewMode === 'nav' ? 130 : 400);
    }, [viewMode]);

    // --- 新增：拖拽调整高度逻辑 ---
    const startResizing = useCallback((e: React.MouseEvent) => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'ns-resize'; // 改变全局指针样式
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'default';
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        // 计算新高度：因为轨道在底部，向上拖拽（clientY 变小）高度应该增加
        // 我们通过当前容器的底部位置减去鼠标位置来计算
        const newHeight = window.innerHeight - e.clientY;
        // 限制最小和最大高度
        if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
            setTrackHeight(newHeight);
        }
    }, []);

    useEffect(() => {
        if (currentVideoPath) loadScreenshotData(currentVideoPath);
    }, [currentVideoPath, loadScreenshotData]);

    // [核心修改] 过滤逻辑
    const filteredScreenshots = useMemo(() => {
        if (filterMode === 'all') return screenshots;
        // 只显示 navigation 属性为 true 的（包括默认没有记录的）
        return screenshots.filter(s => s.meta?.navigation !== false);
    }, [screenshots, filterMode]);

    const screenshotsWithState = useMemo(() => {
        return filteredScreenshots.map(s => { // 这里改为 filteredScreenshots
            const timestampSec = s.timestamp / 1000;
            const parentClip = clips.find(c => timestampSec >= c.startTime && timestampSec < c.endTime);
            return { ...s, isRemoved: parentClip?.state === 'remove' };
        });
    }, [filteredScreenshots, clips]); // 依赖项改为 filteredScreenshots

    const currentTime = usePlayerStore(state => state.currentTime);
    const activeScreenshot = useMemo(() => {
        const currentMs = currentTime * 1000;
        // 算法：过滤出所有小于等于当前时间的，取最后一张
        const pastScreenshots = filteredScreenshots.filter(s => s.timestamp <= currentMs);
        if (pastScreenshots.length === 0) return filteredScreenshots[0]; // 如果还没到第一张，高亮第一张
        return pastScreenshots[pastScreenshots.length - 1];
    }, [filteredScreenshots, currentTime]);

    return (
        <Box style={{ position: 'relative', width: '100%', marginTop: opened ? 0 : 0 }}>

            {/* 1. 拖拽调整条 (Resize Bar) */}
            {opened && (
                <Box
                    onMouseDown={startResizing}
                    style={{
                        position: 'absolute',
                        top: -4, // 稍微偏移以便更容易抓取
                        left: 0,
                        right: 0,
                        height: 8,
                        cursor: 'ns-resize',
                        zIndex: 20,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        // 鼠标悬停时显示提示色
                        transition: 'background-color 0.2s',
                    }}
                    className="resize-handle"
                >
                    <Box style={{
                        width: 40,
                        height: 4,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <IconGripHorizontal size={14} color="rgba(255,255,255,0.5)" />
                    </Box>
                </Box>
            )}

            {/* 2. 控制按钮组 */}
            <Group
                gap={0}
                style={{
                    position: 'absolute',
                    top: opened ? -30 : -20,
                    right: 16,
                    zIndex: 21,
                    transition: 'all 0.2s ease'
                }}
            >
                {opened && (
                    <Box style={{
                        display: 'flex',
                        backgroundColor: 'rgba(20, 20, 20, 0.9)',
                        border: '1px solid #333',
                        borderBottom: 'none',
                        borderRadius: '4px 0 0 0',
                        padding: '2px 6px'
                    }}>
                        <Tooltip label={filterMode === 'all' ? "当前：显示全部" : "当前：仅显示导航项"}>
                            <ActionIcon
                                variant={filterMode === 'nav' ? "filled" : "subtle"}
                                size="sm"
                                color={filterMode === 'nav' ? "blue" : "gray"}
                                onClick={() => setFilterMode(filterMode === 'all' ? 'nav' : 'all')}
                            >
                                {filterMode === 'nav' ? <IconFilter size={16} /> : <IconFilterOff size={16} />}
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label={viewMode === 'nav' ? "切换画廊模式" : "切换导航模式"}>
                            <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => setViewMode(viewMode === 'nav' ? 'preview' : 'nav')}>
                                {viewMode === 'nav' ? <IconLayoutGrid size={16} /> : <IconLayoutNavbar size={16} />}
                            </ActionIcon>
                        </Tooltip>
                    </Box>
                )}

                <UnstyledButton
                    onClick={() => setOpened(!opened)}
                    style={{
                        backgroundColor: 'rgba(34, 139, 230, 0.8)',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: opened ? '0 4px 0 0' : '4px 4px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        height: opened ? 26 : 20
                    }}
                >
                    {opened ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
                    {opened ? '隐藏' : '截图轨道'}
                </UnstyledButton>
            </Group>

            {/* 3. 内容主体 */}
            <Collapse in={opened}>
                <Box style={{
                    borderTop: '1px solid #333',
                    backgroundColor: '#000',
                    overflow: 'hidden',
                    // 使用动态高度
                    height: trackHeight,
                    transition: isResizing.current ? 'none' : 'height 0.2s ease',
                    position: 'relative'
                }}>
                    {isLoading && screenshots.length === 0 ? (
                        <Center h="100%"><Loader size="sm" /></Center>
                    ) : (
                        viewMode === 'nav' ? (
                            <ScreenshotNavView
                                screenshots={screenshotsWithState as any}
                                activeFilename={activeScreenshot?.filename}
                                rotation={rotation}
                                onScreenshotClick={onScreenshotClick}
                                onSetCover={async (s) => {
                                    const screenshotRawPath = s.path.replace('file://', '');
                                    const success = await setAsCover(currentVideoPath!, screenshotRawPath);
                                    if (success) useVideoFileRegistryStore.getState().refreshCover(currentVideoPath!);
                                }}
                                onDelete={s => deleteScreenshot(currentVideoPath!, s.filename)}
                            />
                        ) : (
                            <ScreenshotGalleryView
                                screenshots={screenshotsWithState as any}
                                activeFilename={activeScreenshot?.filename}
                                rotation={rotation}
                                // 将动态高度传给 Gallery 内部
                                containerHeight={trackHeight}
                                onScreenshotClick={onScreenshotClick}
                                onSetCover={async (s) => {
                                    const screenshotRawPath = s.path.replace('file://', '');
                                    const success = await setAsCover(currentVideoPath!, screenshotRawPath);
                                    if (success) useVideoFileRegistryStore.getState().refreshCover(currentVideoPath!);
                                }}
                                onDelete={s => deleteScreenshot(currentVideoPath!, s.filename)}
                            />
                        )
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}