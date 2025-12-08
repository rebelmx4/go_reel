import { Tabs, Tooltip } from '@mantine/core';
import { useNavigationStore, ViewType } from '../../stores';

/**
 * Tab configuration with labels and keyboard shortcuts
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
 * Top Navigation Bar Component
 * Displays tabs for switching between different views
 */
export function TopNavBar() {
    const currentView = useNavigationStore((state) => state.currentView);
    const setView = useNavigationStore((state) => state.setView);

    // Don't show nav bar on configuration screen
    if (currentView === 'configuration') {
        return null;
    }

    return (
        <Tabs
            value={currentView}
            onChange={(value) => setView(value as ViewType)}
            style={{
                borderBottom: '1px solid var(--mantine-color-gray-7)',
                backgroundColor: 'var(--mantine-color-dark-7)',
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
    );
}
