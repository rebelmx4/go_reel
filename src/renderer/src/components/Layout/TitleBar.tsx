// src/renderer/src/components/layout/TitleBar.tsx

import { Box, Group, Text, ActionIcon, Tabs, Tooltip } from '@mantine/core';
import { IconMinus, IconSquare, IconX } from '@tabler/icons-react';
import { useMemo } from 'react';
import {
    usePlaylistStore,
    useNavigationStore,
    useVideoFileRegistryStore,
    selectLikedPaths,
    selectElitePaths,
    selectSearchPaths
} from '../../stores';
import { ViewType } from '../../stores/navigationStore';

const TABS: Array<{ value: ViewType; label: string; shortcut: string }> = [
    { value: 'player_page', label: '播放器', shortcut: 'Esc' },
    { value: 'elite_page', label: '精品', shortcut: '6' },
    { value: 'liked_page', label: '点赞', shortcut: '5' },
    { value: 'history_page', label: '历史', shortcut: '1' },
    { value: 'newest_page', label: '最新', shortcut: '2' },
    { value: 'tag_search_page', label: '标签搜索', shortcut: '3' },
    { value: 'folder_page', label: '文件夹', shortcut: '4' },
    { value: 'settings_page', label: '设置', shortcut: '8' },
    { value: 'tag_manage_page', label: '标签管理', shortcut: '7' },
];

export function TitleBar() {
    // --- 1. Store 数据订阅 ---

    // 播放状态
    const currentPath = usePlaylistStore((s) => s.currentPath);
    const mode = usePlaylistStore((s) => s.mode);
    const searchQuery = usePlaylistStore((s) => s.searchQuery);

    // 档案库数据 (用于计算标题中的数量)
    const registry = useVideoFileRegistryStore();

    // 视图导航
    const currentView = useNavigationStore((state) => state.currentView);
    const setView = useNavigationStore((state) => state.setView);

    // --- 2. 逻辑计算 ---

    /**
     * 动态生成标题：[当前索引/总数] 文件名
     */
    const videoTitle = useMemo(() => {
        if (!currentPath) return 'GoReel - 片遇';

        // 根据当前的播放模式(mode)确定计算队列
        let queue: string[] = [];
        switch (mode) {
            case 'liked': queue = selectLikedPaths(registry); break;
            case 'elite': queue = selectElitePaths(registry); break;
            case 'search': queue = selectSearchPaths(registry, searchQuery); break;
            default: queue = registry.videoPaths;
        }

        const total = queue.length;
        const currentIndex = queue.indexOf(currentPath);
        const displayIndex = currentIndex !== -1 ? currentIndex + 1 : '?';
        const filename = currentPath.split(/[\\/]/).pop() || '';

        return `[${displayIndex}/${total}] ${filename}`;
    }, [currentPath, mode, registry, searchQuery]);

    // --- 3. 原生窗口控制 ---
    const handleMinimize = () => window.api.windowMinimize();
    const handleMaximize = () => window.api.windowMaximize();
    const handleClose = () => window.api.windowClose();

    const handleOpenFolder = () => {
        if (currentPath) {
            window.api.showInExplorer(currentPath);
        }
    };


    return (
        <Box
            style={{
                height: 32,
                backgroundColor: 'var(--mantine-color-dark-7)',
                borderBottom: '1px solid var(--mantine-color-dark-4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                WebkitAppRegion: 'drag',
                userSelect: 'none',
            }}
        >
            {/* 左侧：标签页导航 */}
            <Box style={{ WebkitAppRegion: 'no-drag', flex: '0 0 auto' }}>
                <Tabs
                    value={currentView}
                    onChange={(val) => val && setView(val as ViewType)}
                    styles={{
                        root: { height: 32 },
                        list: { borderBottom: 'none', height: 32 },
                        tab: {
                            height: 32,
                            padding: '0 12px',
                            fontSize: '12px',
                        }
                    }}
                >
                    <Tabs.List>
                        {TABS.map((tab) => (
                            <Tooltip
                                key={tab.value}
                                label={`${tab.label} (${tab.shortcut})`}
                                withArrow
                                position="bottom"
                                openDelay={500}
                            >
                                <Tabs.Tab value={tab.value}>
                                    {tab.label}
                                </Tabs.Tab>
                            </Tooltip>
                        ))}
                    </Tabs.List>
                </Tabs>
            </Box>

            {/* 中间：视频标题展示 */}
            <Box style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: 0, // 防止溢出
                height: '100%'
            }}>
                <Text
                    size="xs"
                    fw={500}
                    onDoubleClick={handleOpenFolder}
                    className="titlebar-filename"
                    style={{
                        padding: '0 8px',
                        color: 'var(--mantine-color-dark-2)',
                        WebkitAppRegion: 'no-drag', // 只有文字区域不可拖拽（可双击）
                        cursor: 'pointer',          // 鼠标变成小手，提示可点击
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        borderRadius: '4px',       // 配合 hover 效果
                    }}
                    title="双击打开所在文件夹"
                >
                    {videoTitle}
                </Text>
            </Box>

            {/* 右侧：窗口控制按钮 */}
            <Group gap={0} style={{ WebkitAppRegion: 'no-drag', flex: '0 0 auto' }}>
                <ActionIcon variant="subtle" color="gray" radius={0} w={38} h={32} onClick={handleMinimize}>
                    <IconMinus size={16} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="gray" radius={0} w={38} h={32} onClick={handleMaximize}>
                    <IconSquare size={14} />
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    color="red"
                    radius={0}
                    w={38}
                    h={32}
                    onClick={handleClose}
                    className="titlebar-close-button"
                >
                    <IconX size={16} />
                </ActionIcon>
            </Group>

            <style>{`
                .mantine-Tabs-tab {
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                }
                .mantine-Tabs-tab[data-active] {
                    border-bottom-color: var(--mantine-color-blue-filled);
                    color: var(--mantine-color-white);
                }
                .titlebar-close-button:hover {
                    background-color: var(--mantine-color-red-8) !important;
                    color: white !important;
                }
                .titlebar-filename:hover {
                    background-color: var(--mantine-color-dark-5);
                    color: var(--mantine-color-white) !important;
                }
            `}</style>
        </Box>
    );
}