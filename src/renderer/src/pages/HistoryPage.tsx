// src/renderer/src/pages/HistoryPage.tsx

import { useMemo } from 'react';
import { Box, Text } from '@mantine/core';
import {
    useVideoFileRegistryStore, // 新的档案库 Store
    usePlaylistStore,          // 合并了历史记录的播放 Store
    useNavigationStore         // 页面切换 Store
} from '../stores';

import { VideoGrid } from '../components/Video/VideoGrid';
import { VideoFile } from '../../../shared/models';

export function HistoryPage() {
    // 1. 从 PlaylistStore 获取历史足迹
    const historyPaths = usePlaylistStore((state) => state.historyPaths);
    const jumpTo = usePlaylistStore((state) => state.jumpTo);

    // 2. 从 RegistryStore 获取视频档案数据
    const videoMap = useVideoFileRegistryStore((state) => state.videos);
    const updateAnnotation = useVideoFileRegistryStore((state) => state.updateAnnotation);

    // 3. 页面视图控制
    const setView = useNavigationStore((state) => state.setView);

    // 4. 将路径列表转换为视频对象列表 (数据派生)
    const historyVideos = useMemo(() => {
        return historyPaths
            .map(path => videoMap[path])
            // 过滤掉可能已经在磁盘上删除但在历史记录中还存在的视频
            .filter((v): v is VideoFile => v !== undefined);
    }, [historyPaths, videoMap]);

    // --- 交互处理 ---

    const handlePlay = (video: VideoFile) => {
        /**
         * 核心：按照你的需求逻辑
         * 1. 调用 jumpTo：切换视频，并强制将播放模式设为 'all'
         * 2. 切换页面到播放器
         */
        jumpTo(video.path, 'all');
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
                <Text size="xl" fw={700} mb={4}>最近播放</Text>
                <Text size="sm" c="dimmed" mb={16}>
                    保留最近 100 条播放记录
                </Text>
            </Box>

            <VideoGrid
                videos={historyVideos}
                onPlay={handlePlay}
                onToggleLike={handleToggleLike}
                onToggleElite={handleToggleElite}
                emptyMessage="暂无播放记录，快去观看视频吧！"
            />
        </Box>
    );
}