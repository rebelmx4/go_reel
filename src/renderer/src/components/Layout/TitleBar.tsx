// src/components/layout/TitleBar.tsx

import { Box, Group, Text, ActionIcon, Tabs, Tooltip } from '@mantine/core';
import { IconMinus, IconSquare, IconX } from '@tabler/icons-react';
import {
    usePlayerStore,
    usePlaylistStore,
    useNavigationStore,
    ViewType
} from '../../stores';

/**
 * 导航标签配置
 * 这里的快捷键仅作为 UI 提示，实际拦截逻辑通常在全局 KeyboardListener 中处理
 */
const TABS: Array<{ value: ViewType; label: string; shortcut: string }> = [
    { value: 'player', label: '播放器', shortcut: 'Esc' },
    { value: 'elite', label: '精品', shortcut: '6' },
    { value: 'liked', label: '点赞', shortcut: '5' },
    { value: 'history', label: '历史', shortcut: '1' },
    { value: 'newest', label: '最新', shortcut: '2' },
    { value: 'search', label: '搜索', shortcut: '3' },
    { value: 'settings', label: '设置', shortcut: '8' },
];

/**
 * 自定义标题栏组件
 */
export function TitleBar() {
    // 1. 播放状态（用于展示当前正在播什么）
    const currentPath = usePlaylistStore((s) => s.currentPath);
    const getCurrentQueue = usePlaylistStore((s) => s.getCurrentQueue);
    const duration = usePlayerStore((state) => state.duration);

    // 2. 导航状态（用于 Tab 切换）
    const currentView = useNavigationStore((state) => state.currentView);
    const setView = useNavigationStore((state) => state.setView);

    // --- 窗口控制 ---
    const handleMinimize = () => window.api.windowMinimize();
    const handleMaximize = () => window.api.windowMaximize();
    const handleClose = () => window.api.windowClose();

    /**
     * 获取格式化的标题
     * 格式：[当前索引/总数] 文件名 (总时长)
     */
    const getVideoTitle = () => {
        if (!currentPath) {
            return 'GoReel - 片遇';
        }

        // 获取当前播放模式下的队列（用于计算 Index/Total）
        const queue = getCurrentQueue();
        const total = queue.length;
        const currentIndex = queue.indexOf(currentPath);
        const displayIndex = currentIndex !== -1 ? currentIndex + 1 : 1;

        // 从路径提取文件名
        const filename = currentPath.split(/[\\/]/).pop() || '';

        // 时长格式化函数
        const formatDuration = (seconds: number) => {
            if (!seconds || seconds <= 0) return '00:00';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);

            if (h > 0) {
                return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
            return `${m}:${s.toString().padStart(2, '0')}`;
        };

        const durationStr = formatDuration(duration);

        return `[${displayIndex}/${total}] ${filename} (${durationStr})`;
    };

    /**
     * 处理标签页切换
     * 仅改变 UI 视图，不改变 Playlist 模式
     */
    const handleTabChange = (value: string | null) => {
        if (value) {
            setView(value as ViewType);
        }
    };

    // 如果当前在配置引导界面，隐藏 Tabs
    const showTabs = true;

    return (
        <Box
            style={{
                height: 32,
                backgroundColor: 'var(--mantine-color-dark-7)',
                borderBottom: '1px solid var(--mantine-color-dark-4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                WebkitAppRegion: 'drag', // 允许拖拽窗口
                userSelect: 'none',
            }}
        >
            {/* 左侧：导航标签页 */}
            <Box style={{ WebkitAppRegion: 'no-drag', flex: '0 0 auto' }}>
                {showTabs ? (
                    <Tabs
                        value={currentView}
                        onChange={handleTabChange}
                        styles={{
                            root: { height: 32 },
                            list: { borderBottom: 'none', height: 32 },
                            tab: {
                                height: 32,
                                padding: '0 12px',
                                fontSize: '12px',
                                borderBottom: '2px solid transparent',
                                transition: 'all 0.2s ease',
                                '&[data-active]': {
                                    borderColor: 'var(--mantine-color-blue-filled)',
                                }
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
                ) : (
                    <Box style={{ width: 12 }} />
                )}
            </Box>

            {/* 中间：视频标题信息 */}
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
                    // 标题文字通常不需要响应鼠标，让位给窗口拖拽
                    pointerEvents: 'none',
                }}
            >
                {getVideoTitle()}
            </Text>

            {/* 右侧：窗口控制按钮 */}
            <Group gap={0} style={{ WebkitAppRegion: 'no-drag', flex: '0 0 auto' }}>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    radius={0}
                    w={38}
                    h={32}
                    onClick={handleMinimize}
                >
                    <IconMinus size={16} />
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    radius={0}
                    w={38}
                    h={32}
                    onClick={handleMaximize}
                >
                    <IconSquare size={14} />
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    color="red"
                    radius={0}
                    w={38}
                    h={32}
                    onClick={handleClose}
                    // 悬浮时显示红色背景，类似原生 Windows 关闭按钮
                    styles={{
                        root: {
                            '&:hover': {
                                backgroundColor: 'var(--mantine-color-red-8)',
                                color: 'white'
                            }
                        }
                    }}
                >
                    <IconX size={16} />
                </ActionIcon>
            </Group>
        </Box>
    );
}