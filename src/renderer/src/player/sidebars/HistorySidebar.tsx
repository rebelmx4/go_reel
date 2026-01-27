// src/renderer/src/player/sidebars/HistorySidebar.tsx

import { Box, Text, Divider } from '@mantine/core';
import { useMemo } from 'react';
import {
    useVideoFileRegistryStore,
    usePlaylistStore
} from '../../stores';
import { SidebarVideoList } from './SidebarVideoList';
import { VideoFile } from '../../../../shared/models';

export function HistorySidebar() {
    // 1. 获取历史路径和档案库
    const historyPaths = usePlaylistStore((state) => state.historyPaths);
    const videoMap = useVideoFileRegistryStore((state) => state.videos);
    const updateAnnotation = useVideoFileRegistryStore((state) => state.updateAnnotation);
    const jumpTo = usePlaylistStore((state) => state.jumpTo);

    // 2. 将路径转换为视频对象列表
    const historyVideos = useMemo(() => {
        return historyPaths
            .map(path => videoMap[path])
            .filter((v): v is VideoFile => v !== undefined);
    }, [historyPaths, videoMap]);

    // --- 交互处理 ---

    const handlePlay = (video: VideoFile) => {
        // 根据你的需求：直接跳转，不传 targetMode，保留当前 mode
        jumpTo(video.path);
    };

    const handleToggleLike = (video: VideoFile) => {
        const currentLike = video.annotation?.like_count ?? 0;
        updateAnnotation(video.path, {
            like_count: currentLike > 0 ? 0 : 1
        });
    };

    const handleToggleElite = (video: VideoFile) => {
        const currentFavorite = !!video.annotation?.is_favorite;
        updateAnnotation(video.path, {
            is_favorite: !currentFavorite
        });
    };

    return (
        <Box
            style={{
                width: 300,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--mantine-color-dark-7)',
                borderLeft: '1px solid var(--mantine-color-dark-4)',
                flexShrink: 0
            }}
        >
            <Box style={{ padding: '16px 16px 12px 16px' }}>
                <Text fw={700} size="md">播放历史</Text>
                <Text size="xs" c="dimmed">最近播放过的视频 ({historyVideos.length})</Text>
            </Box>

            <Divider color="dark.4" />

            <Box style={{ flex: 1, overflow: 'hidden' }}>
                <SidebarVideoList
                    videos={historyVideos}
                    onPlay={handlePlay}
                    onToggleLike={handleToggleLike}
                    onToggleElite={handleToggleElite}
                    emptyMessage="暂无播放记录"
                />
            </Box>
        </Box>
    );
}