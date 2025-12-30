// src/components/layout/TitleBar.tsx

import { Box, Group, Text, ActionIcon, Tabs, Tooltip } from '@mantine/core';
import { IconMinus, IconSquare, IconX } from '@tabler/icons-react';
import {
    usePlayerStore,
    usePlaylistStore,
    useNavigationStore,
    ViewType
} from '../../stores';

const TABS: Array<{ value: ViewType; label: string; shortcut: string }> = [
    { value: 'player', label: '播放器', shortcut: 'Esc' },
    { value: 'elite', label: '精品', shortcut: '6' },
    { value: 'liked', label: '点赞', shortcut: '5' },
    { value: 'history', label: '历史', shortcut: '1' },
    { value: 'newest', label: '最新', shortcut: '2' },
    { value: 'search', label: '搜索', shortcut: '3' },
    { value: 'settings', label: '设置', shortcut: '8' },
];

export function TitleBar() {
    const currentPath = usePlaylistStore((s) => s.currentPath);
    const getCurrentQueue = usePlaylistStore((s) => s.getCurrentQueue);
    const duration = usePlayerStore((state) => state.duration);

    const currentView = useNavigationStore((state) => state.currentView);
    const setView = useNavigationStore((state) => state.setView);

    const handleMinimize = () => window.api.windowMinimize();
    const handleMaximize = () => window.api.windowMaximize();
    const handleClose = () => window.api.windowClose();

    const getVideoTitle = () => {
        if (!currentPath) return 'GoReel - 片遇';
        const queue = getCurrentQueue();
        const total = queue.length;
        const currentIndex = queue.indexOf(currentPath);
        const displayIndex = currentIndex !== -1 ? currentIndex + 1 : 1;
        const filename = currentPath.split(/[\\/]/).pop() || '';

        const formatDuration = (seconds: number) => {
            if (!seconds || seconds <= 0) return '00:00';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
        };

        return `[${displayIndex}/${total}] ${filename} (${formatDuration(duration)})`;
    };

    const handleTabChange = (value: string | null) => {
        if (value) setView(value as ViewType);
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
            <Box style={{ WebkitAppRegion: 'no-drag', flex: '0 0 auto' }}>
                <Tabs
                    value={currentView}
                    onChange={handleTabChange}
                    // 1. 这里移除了报错的 &[data-active]
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

            <Text
                size="xs"
                fw={500}
                style={{
                    flex: 1,
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: '0 20px',
                    color: 'var(--mantine-color-dark-2)',
                    pointerEvents: 'none',
                }}
            >
                {getVideoTitle()}
            </Text>

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

            {/* 2. 将 CSS 逻辑移动到这里 */}
            <style>{`
                /* 基础 Tab 样式 */
                .mantine-Tabs-tab {
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                }

                /* 激活状态的 Tab 样式 (解决报错的关键) */
                .mantine-Tabs-tab[data-active] {
                    border-bottom-color: var(--mantine-color-blue-filled);
                    color: var(--mantine-color-white);
                }

                /* 关闭按钮悬浮效果 */
                .titlebar-close-button:hover {
                    background-color: var(--mantine-color-red-8) !important;
                    color: white !important;
                }
            `}</style>
        </Box>
    );
}