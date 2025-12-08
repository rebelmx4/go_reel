import { Box, Group, Text, ActionIcon, Tabs, Tooltip } from '@mantine/core';
import { IconMinus, IconSquare, IconX } from '@tabler/icons-react';
import { usePlayerStore, usePlaylistStore, useNavigationStore, ViewType } from '../../stores';
import { getFilename } from '../../utils/pathUtils';

/**
 * Tab configuration
 */
const TABS: Array<{ value: ViewType; label: string; shortcut: string }> = [
    { value: 'player', label: '播放器', shortcut: 'Esc' },
    { value: 'elite', label: '精品', shortcut: '6' },
    { value: 'liked', label: '点赞', shortcut: '5' },
    { value: 'recent', label: '最近', shortcut: '1' },
    { value: 'newest', label: '最新', shortcut: '2' },
    { value: 'search', label: '文件名搜索', shortcut: '3' },
    { value: 'tag-search', label: '标签搜索', shortcut: '7' },
    { value: 'settings', label: '设置', shortcut: '8' },
];

/**
 * Custom Title Bar Component
 * Displays: Navigation Tabs | Video Title | Window Controls
 */
export function TitleBar() {
    const currentVideoPath = usePlayerStore((state) => state.currentVideoPath);
    const duration = usePlayerStore((state) => state.duration);
    const playlist = usePlaylistStore((state) => state.playlist);
    const currentVideoId = usePlaylistStore((state) => state.currentVideoId);
    const currentView = useNavigationStore((state) => state.currentView);
    const setView = useNavigationStore((state) => state.setView);

    const handleMinimize = () => {
        window.api.windowMinimize();
    };

    const handleMaximize = () => {
        window.api.windowMaximize();
    };

    const handleClose = () => {
        window.api.windowClose();
    };

    // Format video title
    const getVideoTitle = () => {
        if (!currentVideoPath) {
            return 'GoReel - 片遇';
        }

        const total = playlist.length || 1;
        const index = currentVideoId
            ? (playlist.findIndex(v => v.id === currentVideoId) + 1) || 1
            : 1;

        const filename = getFilename(currentVideoPath);

        const formatDuration = (seconds: number) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);

            if (h > 0) {
                return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
            return `${m}:${s.toString().padStart(2, '0')}`;
        };

        const durationStr = duration > 0 ? formatDuration(duration) : '00:00';

        return `[${index}/${total}] ${filename} (${durationStr})`;
    };

    // Don't show tabs on configuration screen
    const showTabs = currentView !== 'configuration';

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
            {/* Left: Navigation Tabs */}
            {showTabs ? (
                <Box style={{ WebkitAppRegion: 'no-drag', flex: '0 0 auto' }}>
                    <Tabs
                        value={currentView}
                        onChange={(value) => setView(value as ViewType)}
                        styles={{
                            root: { height: 32 },
                            list: {
                                borderBottom: 'none',
                                height: 32,
                            },
                            tab: {
                                height: 32,
                                padding: '0 12px',
                                fontSize: '12px',
                            }
                        }}
                    >
                        <Tabs.List>
                            {TABS.map((tab) => (
                                <Tooltip key={tab.value} label={`${tab.label} (${tab.shortcut})`} withArrow>
                                    <Tabs.Tab value={tab.value}>{tab.label}</Tabs.Tab>
                                </Tooltip>
                            ))}
                        </Tabs.List>
                    </Tabs>
                </Box>
            ) : (
                <Box style={{ width: 8 }} />
            )}

            {/* Center: Title Text */}
            <Text
                size="sm"
                style={{
                    flex: 1,
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: '0 16px',
                }}
            >
                {getVideoTitle()}
            </Text>

            {/* Right: Window Controls */}
            <Group gap={4} style={{ WebkitAppRegion: 'no-drag', flex: '0 0 auto', paddingRight: 8 }}>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={handleMinimize}
                    aria-label="Minimize"
                >
                    <IconMinus size={16} />
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={handleMaximize}
                    aria-label="Maximize"
                >
                    <IconSquare size={14} />
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={handleClose}
                    aria-label="Close"
                >
                    <IconX size={16} />
                </ActionIcon>
            </Group>
        </Box>
    );
}
