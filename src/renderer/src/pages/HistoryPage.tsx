import { useMemo, useState, useCallback } from 'react';
import { Box, Text, Button, Group } from '@mantine/core';
import { IconCamera, IconSquareX } from '@tabler/icons-react';
import {
    useVideoFileRegistryStore,
    usePlaylistStore,
    useNavigationStore,
    useToastStore
} from '../stores';

import { VideoGrid } from '../components/Video/VideoGrid';
import { VideoFile } from '../../../shared/models';

export function HistoryPage() {
    const historyPaths = usePlaylistStore((state) => state.historyPaths);
    const jumpTo = usePlaylistStore((state) => state.jumpTo);
    const videoMap = useVideoFileRegistryStore((state) => state.videos);
    const updateAnnotation = useVideoFileRegistryStore((state) => state.updateAnnotation);
    const setView = useNavigationStore((state) => state.setView);
    const showToast = useToastStore((state) => state.showToast);

    // --- 多选状态 ---
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

    const historyVideos = useMemo(() => {
        return historyPaths
            .map(path => videoMap[path])
            .filter((v): v is VideoFile => v !== undefined);
    }, [historyPaths, videoMap]);

    // --- 交互处理 ---

    const handleSelect = useCallback((index: number, event: React.MouseEvent) => {
        const path = historyVideos[index].path;
        const newSelected = new Set(selectedPaths);

        if (event.shiftKey && lastSelectedIndex !== null) {
            // Shift 连选
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            for (let i = start; i <= end; i++) {
                newSelected.add(historyVideos[i].path);
            }
        } else if (event.ctrlKey || event.metaKey) {
            // Ctrl/Cmd 切换
            if (newSelected.has(path)) newSelected.delete(path);
            else newSelected.add(path);
        } else {
            // 单选（清除其他）
            newSelected.clear();
            newSelected.add(path);
        }

        setSelectedPaths(newSelected);
        setLastSelectedIndex(index);
    }, [historyVideos, selectedPaths, lastSelectedIndex]);

    const handlePlay = (video: VideoFile) => {
        jumpTo(video.path, 'all');
        setView('player_page');
    };

    const handleBatchExport = async () => {
        if (selectedPaths.size === 0) return;

        const paths = Array.from(selectedPaths);
        showToast({ message: `准备导出 ${paths.length} 个视频的截图...`, type: 'info' });

        let successCount = 0;
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            const video = videoMap[path];
            if (!video) continue;

            try {
                // 1. 确定旋转角度 (逻辑同 Dialog)
                let rotation: number = video.annotation?.screenshot_rotation ?? -1;

                if (rotation === -1) {
                    const metadata = await window.api.getVideoMetadata(path);
                    if (metadata) {
                        rotation = metadata.width > metadata.height ? 90 : 0;
                    } else {
                        rotation = 0;
                    }
                }

                // 2. 直接导出
                await window.api.exportScreenshots(path, rotation);
                successCount++;

                // 可选：更新进度提示
                if (paths.length > 1) {
                    showToast({ message: `正在导出 (${successCount}/${paths.length})`, type: 'info' });
                }
            } catch (err) {
                console.error(`Export failed for ${path}:`, err);
            }
        }

        showToast({ message: `成功导出 ${successCount} 个视频的截图`, type: 'success' });
        setSelectedPaths(new Set());
    };

    return (
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box style={{ padding: '20px 20px 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                    <Text size="xl" fw={700} mb={4}>最近播放</Text>
                    <Text size="sm" c="dimmed">
                        {selectedPaths.size > 0 ? `已选中 ${selectedPaths.size} 项` : '保留最近 100 条播放记录'}
                    </Text>
                </Box>

                {selectedPaths.size > 0 && (
                    <Group gap="xs">
                        <Button
                            variant="light"
                            color="gray"
                            leftSection={<IconSquareX size={16} />}
                            onClick={() => setSelectedPaths(new Set())}
                        >
                            取消选中
                        </Button>
                        <Button
                            leftSection={<IconCamera size={16} />}
                            onClick={handleBatchExport}
                        >
                            批量导出截图
                        </Button>
                    </Group>
                )}
            </Box>

            <Box style={{ flex: 1, overflow: 'auto' }}>
                <VideoGrid
                    videos={historyVideos}
                    selectedPaths={selectedPaths}
                    onSelect={handleSelect}
                    onPlay={handlePlay}
                    onToggleLike={(v) => updateAnnotation(v.path, { like_count: (v.annotation?.like_count ?? 0) > 0 ? 0 : 1 })}
                    onToggleElite={(v) => updateAnnotation(v.path, { is_favorite: !v.annotation?.is_favorite })}
                    emptyMessage="暂无播放记录，快去观看视频吧！"
                />
            </Box>
        </Box>
    );
}