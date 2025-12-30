import { useEffect, useMemo } from 'react';
import { Box, Text } from '@mantine/core';
import {
    useVideoStore,
    usePlaylistStore,
    useHistoryStore
} from '../stores';
import { useNavigationStore } from '../stores/navigationStore';

import { VideoGrid } from '../components/Video/VideoGrid';
import { JoinedVideo } from '../../../shared/models';

export function HistoryPage() {
    // 1. 获取历史记录路径列表 & 加载动作
    const historyPaths = useHistoryStore((state) => state.historyPaths);
    const loadHistory = useHistoryStore((state) => state.loadHistory);

    // 2. 获取视频库数据与更新方法
    const videoMap = useVideoStore((state) => state.videos);
    const updateAnnotation = useVideoStore((state) => state.updateAnnotation);
    const initStore = useVideoStore((state) => state.initStore);

    // 3. 导航与播放控制
    const setCurrentVideoPath = usePlaylistStore((state) => state.setCurrentPath);
    const setView = useNavigationStore((state) => state.setView);
    const setCurrentPlaylistPath = usePlaylistStore((state) => state.setCurrentPath);

    // 4. 【核心逻辑】将路径列表转换为视频对象列表
    const historyVideos = useMemo(() => {
        return historyPaths
            .map(path => videoMap[path])
            .filter((v): v is JoinedVideo => v !== undefined);
    }, [historyPaths, videoMap]);

    // 初始化加载
    useEffect(() => {
        loadHistory();
        // 如果视频库尚未初始化，则初始化
        if (Object.keys(videoMap).length === 0) {
            initStore();
        }
    }, [loadHistory, initStore, videoMap]);

    const handlePlay = (video: JoinedVideo) => {
        // 使用 path 切换播放器
        setCurrentVideoPath(video.path);
        // 更新播放列表当前活跃项
        setCurrentPlaylistPath(video.path);
        // 切换视图
        setView('player');
    };

    const handleToggleLike = (video: JoinedVideo) => {
        const currentLike = video.annotation?.like_count ?? 0;
        // 简单的开关逻辑：如果 > 0 则取消(0)，否则设为 1
        updateAnnotation(video.path, {
            like_count: currentLike > 0 ? 0 : 1
        });
    };

    const handleToggleElite = (video: JoinedVideo) => {
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