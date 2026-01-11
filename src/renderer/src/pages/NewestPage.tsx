// src/renderer/src/pages/NewestPage.tsx

import { Box, Text } from '@mantine/core';
import {
    useVideoFileRegistryStore, // 新的档案库 Store
    useNewestFiles,             // 直接获取前 100 个视频对象的 Hook
    usePlaylistStore,
    useNavigationStore
} from '../stores';
import { VideoGrid } from '../components/Video/VideoGrid';
import { VideoFile } from '../../../shared/models';


export function NewestPage() {
    // 1. 直接获取前 100 个视频对象列表
    // 这个 Hook 内部已经处理了 useShallow 和路径映射，且 bootstrap 已保证数据到位
    const newestVideos = useNewestFiles();

    // 2. 获取操作 Action
    const updateAnnotation = useVideoFileRegistryStore((state) => state.updateAnnotation);
    const jumpTo = usePlaylistStore((state) => state.jumpTo);
    const setView = useNavigationStore((state) => state.setView);

    // --- 交互处理 ---


    const handlePlay = (video: VideoFile) => {
        /**
         * 逻辑统一：
         * 1. 使用 jumpTo 切换到目标视频，并设为 'all' 播放模式
         * 2. 切换页面到播放器
         */
        jumpTo(video.path, 'newest');
        setView('player');
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
        <Box style={{ height: '100%', overflow: 'auto' }}>
            <Box style={{ padding: '20px 20px 0 20px' }}>
                <Text size="xl" fw={700} mb={4}>最新视频</Text>
                <Text size="sm" c="dimmed" mb={16}>
                    展示最近添加或修改的前 100 个视频
                </Text>
            </Box>

            <VideoGrid
                videos={newestVideos}
                onPlay={handlePlay}
                onToggleLike={handleToggleLike}
                onToggleElite={handleToggleElite}
                emptyMessage="暂无视频，请检查配置的视频路径。"
            />
        </Box>
    );
}