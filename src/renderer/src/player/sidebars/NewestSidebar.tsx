// src/renderer/src/player/sidebars/NewestSidebar.tsx

import { Box, Text, Divider } from '@mantine/core';
import {
    useVideoFileRegistryStore,
    useNewestFiles,
    usePlaylistStore
} from '../../stores';
import { SidebarVideoList } from './SidebarVideoList';
import { VideoFile } from '../../../../shared/models';

export function NewestSidebar() {
    // 1. 获取数据（复用原 NewestPage 的逻辑）
    const newestVideos = useNewestFiles();

    // 2. 获取操作 Action
    const updateAnnotation = useVideoFileRegistryStore((state) => state.updateAnnotation);
    const jumpTo = usePlaylistStore((state) => state.jumpTo);

    // --- 交互处理 ---

    const handlePlay = (video: VideoFile) => {
        // 切换到目标视频，并将播放模式设为 'newest'
        jumpTo(video.path, 'newest');
        // 注意：因为已在播放器内，无需调用 setView('player_page')
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
                flexShrink: 0 // 防止侧边栏被压缩
            }}
        >
            {/* 侧边栏头部 */}
            <Box style={{ padding: '16px 16px 12px 16px' }}>
                <Text fw={700} size="md">最新视频</Text>
                <Text size="xs" c="dimmed">最近添加的前 100 个视频</Text>
            </Box>

            <Divider color="dark.4" />

            {/* 列表区域 */}
            <Box style={{ flex: 1, overflow: 'hidden' }}>
                <SidebarVideoList
                    videos={newestVideos}
                    onPlay={handlePlay}
                    onToggleLike={handleToggleLike}
                    onToggleElite={handleToggleElite}
                    emptyMessage="暂无视频"
                />
            </Box>
        </Box>
    );
}