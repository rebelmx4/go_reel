import { Box, Group, ActionIcon, Tooltip, Loader, Center, Collapse, UnstyledButton } from '@mantine/core';
import { IconLayoutGrid, IconLayoutNavbar, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import { usePlayerStore, useScreenshotStore, useToastStore, usePlaylistStore } from '../stores';
import { useMemo, useState, useEffect } from 'react';
import { ScreenshotNavView } from './ScreenshotNavView';
import { ScreenshotGalleryView } from './ScreenshotGalleryView';

export function ScreenshotTrack({ onScreenshotClick }: { onScreenshotClick: (ts: number) => void }) {
    const [viewMode, setViewMode] = useState<'nav' | 'preview'>('nav');
    const [opened, setOpened] = useState(true);

    const { screenshots, isLoading, loadScreenshots, deleteScreenshot, setAsCover } = useScreenshotStore();
    const currentVideoPath = usePlaylistStore(state => state.currentPath);
    const currentTime = usePlayerStore(state => state.currentTime);
    const rotation = usePlayerStore(state => state.rotation);
    const showToast = useToastStore(state => state.showToast);

    useEffect(() => {
        if (currentVideoPath) loadScreenshots(currentVideoPath);
    }, [currentVideoPath, loadScreenshots]);

    const activeScreenshot = useMemo(() => {
        if (screenshots.length === 0) return null;
        const currentMs = currentTime * 1000;
        return screenshots.reduce((closest, s) => {
            const currentDiff = Math.abs(s.timestamp - currentMs);
            const closestDiff = Math.abs(closest.timestamp - currentMs);
            return currentDiff < closestDiff ? s : closest;
        });
    }, [currentTime, screenshots]);

    return (
        <Box style={{ position: 'relative', width: '100%', marginTop: opened ? 30 : 0 }}>
            {/* 动态控制条 */}
            <Group
                gap={0}
                style={{
                    position: 'absolute',
                    top: opened ? -30 : -20, // 隐藏时贴近底部
                    right: 0,
                    zIndex: 10,
                    transition: 'all 0.2s ease'
                }}
            >
                {/* 只有展开时才显示模式切换 */}
                {opened && (
                    <Box style={{
                        display: 'flex',
                        backgroundColor: 'rgba(20, 20, 20, 0.9)',
                        border: '1px solid #333',
                        borderBottom: 'none',
                        borderRadius: '4px 0 0 0',
                        padding: '2px 6px'
                    }}>
                        <Tooltip label={viewMode === 'nav' ? "预览模式 (大图)" : "导航模式 (小图)"}>
                            <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => setViewMode(viewMode === 'nav' ? 'preview' : 'nav')}>
                                {viewMode === 'nav' ? <IconLayoutGrid size={16} /> : <IconLayoutNavbar size={16} />}
                            </ActionIcon>
                        </Tooltip>
                    </Box>
                )}

                {/* 收起/展开按钮：永远存在但位置自适应 */}
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

            {/* 轨道主体 */}
            <Collapse in={opened}>
                <Box style={{
                    borderTop: '1px solid #333',
                    backgroundColor: '#000', // 预览模式用纯黑背景更专业
                    overflow: 'hidden',
                    height: opened ? (viewMode === 'nav' ? 124 : 320) : 0, // 明确高度防止抖动
                    transition: 'height 0.2s ease'
                }}>
                    {isLoading && screenshots.length === 0 ? (
                        <Center h={viewMode === 'nav' ? 120 : 320}><Loader size="sm" /></Center>
                    ) : (
                        viewMode === 'nav' ? (
                            <ScreenshotNavView
                                screenshots={screenshots}
                                activeFilename={activeScreenshot?.filename}
                                rotation={rotation}
                                onScreenshotClick={onScreenshotClick}
                                onSetCover={s => setAsCover(currentVideoPath!, s.path.replace('file://', ''))}
                                onDelete={s => deleteScreenshot(currentVideoPath!, s.filename)}
                            />
                        ) : (
                            <ScreenshotGalleryView
                                screenshots={screenshots}
                                activeFilename={activeScreenshot?.filename}
                                rotation={rotation}
                                onScreenshotClick={onScreenshotClick}
                                onSetCover={s => setAsCover(currentVideoPath!, s.path.replace('file://', ''))}
                                onDelete={s => deleteScreenshot(currentVideoPath!, s.filename)}
                            />
                        )
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}