import { useEffect, useMemo } from 'react';
import { Box, Text } from '@mantine/core';
import {
    useVideoStore,
    usePlaylistStore,
    useNavigationStore,
    useElitePaths // 使用 videoStore.ts 中导出的选择器
} from '../stores';
import { VideoGrid } from '../components/Video/VideoGrid';
import { JoinedVideo } from '../../../shared/models';

export function ElitePage() {
    // 1. 获取精品视频数据
    const elitePaths = useElitePaths();
    const videoMap = useVideoStore((state) => state.videos);
    const updateAnnotation = useVideoStore((state) => state.updateAnnotation);
    const initStore = useVideoStore((state) => state.initStore);

    // 2. 播放与列表控制
    const setPlaylistMode = usePlaylistStore((state) => state.setMode);
    const setCurrentPath = usePlaylistStore((state) => state.setCurrentPath);

    // 3. 导航与播放器控制
    const setView = useNavigationStore((state) => state.setView);
    const setCurrentVideo = usePlaylistStore((state) => state.setCurrentPath);

    // 4. 将路径映射为完整的视频对象
    const eliteVideos = useMemo(() => {
        return elitePaths
            .map(path => videoMap[path])
            .filter((v): v is JoinedVideo => v !== undefined);
    }, [elitePaths, videoMap]);

    // 初始化：确保数据加载并设置播放列表模式
    useEffect(() => {
        if (Object.keys(videoMap).length === 0) {
            initStore();
        }
        // 进入页面时，将全局播放模式设为 'elite'
        // 这样在精品页面点击播放后，点击“下一首”也只会在精品中循环
        setPlaylistMode('elite');
    }, [initStore, setPlaylistMode, videoMap]);

    const handlePlay = (video: JoinedVideo) => {
        // 1. 设置当前播放路径（内部会自动触发 historyStore.addToHistory）
        setCurrentPath(video.path);

        // 2. 同步给播放器（如果 PlayerStore 需要手动设置）
        if (setCurrentVideo) {
            setCurrentVideo(video.path);
        }

        // 3. 切换视图
        setView('player');
    };

    const handleToggleLike = (video: JoinedVideo) => {
        const currentLike = video.annotation?.like_count ?? 0;
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