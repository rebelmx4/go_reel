// src/renderer/src/player/sidebars/EliteSidebar.tsx

import { Box, Text, Divider } from '@mantine/core';
import {
    useVideoFileRegistryStore,
    useEliteFiles,
    usePlaylistStore
} from '../../stores';
import { SidebarVideoList } from './SidebarVideoList';
import { VideoFile } from '../../../../shared/models';

export function EliteSidebar() {
    const eliteVideos = useEliteFiles();
    const updateAnnotation = useVideoFileRegistryStore((state) => state.updateAnnotation);
    const jumpTo = usePlaylistStore((state) => state.jumpTo);

    const handlePlay = (video: VideoFile) => {
        jumpTo(video.path, 'elite');
    };

    const handleToggleLike = (video: VideoFile) => {
        const currentLike = video.annotation?.like_count ?? 0;
        updateAnnotation(video.path, { like_count: currentLike > 0 ? 0 : 1 });
    };

    const handleToggleElite = (video: VideoFile) => {
        const currentFavorite = !!video.annotation?.is_favorite;
        updateAnnotation(video.path, { is_favorite: !currentFavorite });
    };

    return (
        <Box style={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--mantine-color-dark-7)', borderLeft: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}>
            <Box style={{ padding: '16px 16px 12px 16px' }}>
                <Text fw={700} size="md">精品收藏</Text>
                <Text size="xs" c="dimmed">已标记为星标的视频 ({eliteVideos.length})</Text>
            </Box>
            <Divider color="dark.4" />
            <Box style={{ flex: 1, overflow: 'hidden' }}>
                <SidebarVideoList
                    videos={eliteVideos}
                    onPlay={handlePlay}
                    onToggleLike={handleToggleLike}
                    onToggleElite={handleToggleElite}
                    emptyMessage="暂无收藏"
                />
            </Box>
        </Box>
    );
}