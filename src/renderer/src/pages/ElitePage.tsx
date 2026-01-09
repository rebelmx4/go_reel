// src/renderer/src/pages/ElitePage.tsx

import { useEffect } from 'react';
import { Box, Text } from '@mantine/core';
import {
    useVideoFileRegistryStore, // 新的档案库 Store
    useEliteFiles,              // 直接获取精品视频对象的 Hook
    usePlaylistStore,
    useNavigationStore
} from '../stores';
import { VideoGrid } from '../components/Video/VideoGrid';
import { VideoFile } from '../../../shared/models';

export function ElitePage() {
    // 1. 直接获取精品视频列表
    const eliteVideos = useEliteFiles();

    // 2. 获取 Store Actions
    const updateAnnotation = useVideoFileRegistryStore((state) => state.updateAnnotation);
    const jumpTo = usePlaylistStore((state) => state.jumpTo);
    const setPlaylistMode = usePlaylistStore((state) => state.setMode);
    const setView = useNavigationStore((state) => state.setView);

    // 3. 页面进入时的逻辑
    useEffect(() => {
        // 当用户浏览精品页面时，将播放模式预设为 'elite'
        // 这样即使不点击视频直接切回播放器，按“下一首”也会在精品里循环
        setPlaylistMode('elite');
    }, [setPlaylistMode]);

    const handlePlay = (video: VideoFile) => {
        /**
         * 逻辑执行：
         * 1. 调用 jumpTo：切换到该视频，并确保模式为 'elite'
         * 2. 切换到播放器视图
         */
        jumpTo(video.path, 'elite');
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
                <Text size="xl" fw={700} mb={4}>精品收藏</Text>
                <Text size="sm" c="dimmed" mb={16}>
                    您手动标记的精选视频 ({eliteVideos.length})
                </Text>
            </Box>

            <VideoGrid
                videos={eliteVideos}
                onPlay={handlePlay}
                onToggleLike={handleToggleLike}
                onToggleElite={handleToggleElite}
                emptyMessage="暂无精品视频，在播放器点击星标按钮进行收藏"
            />
        </Box>
    );
}