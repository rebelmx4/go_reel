import { useEffect } from 'react';
import { Box, Text } from '@mantine/core';
import { useVideoStore, usePlayerStore, useNavigationStore, usePlaylistStore, VideoFile } from '../stores';
import { VideoGrid } from '../components/Video/VideoGrid';

export function ElitePage() {
    // 1. 获取精品视频列表 (已在 videoStore 中通过 is_favorite 筛选)
    const videos = useVideoStore((state) => state.getEliteVideos());
    const loadVideos = useVideoStore((state) => state.loadVideos);
    const toggleLike = useVideoStore((state) => state.toggleLike);
    const toggleElite = useVideoStore((state) => state.toggleElite);

    // 2. 播放器状态控制
    const setCurrentVideo = usePlayerStore((state) => state.setCurrentVideo);
    const setView = useNavigationStore((state) => state.setView);

    // 3. 播放列表控制
    const setPlaylistMode = usePlaylistStore((state) => state.setMode);
    const setPlaylist = usePlaylistStore((state) => state.setPlaylist);
    const setCurrentVideoId = usePlaylistStore((state) => state.setCurrentVideo);

    useEffect(() => {
        loadVideos();
        // setPlaylistMode('elite');
    }, [loadVideos, setPlaylistMode]);

    // 当列表数据变化时（例如取消收藏导致列表变短），同步给播放列表
    useEffect(() => {
        setPlaylist(videos);
    }, [videos, setPlaylist]);

    const handlePlay = (video: VideoFile) => {
        setCurrentVideo(video.path);
        setCurrentVideoId(video.hash); // 使用 hash 作为 ID
        setView('player');
        // 注意：无需手动 updateLastPlayed，VideoPlayer 内部的 history logic 会处理
    };

    return (
        <Box style={{ height: '100%', overflow: 'auto' }}>
            <Box style={{ padding: '20px 20px 0 20px' }}>
                <Text size="xl" fw={700} mb={4}>精品收藏</Text>
                <Text size="sm" c="dimmed" mb={16}>
                    您手动标记的精选视频 ({videos.length})
                </Text>
            </Box>

            <VideoGrid
                videos={videos}
                onPlay={handlePlay}
                onToggleLike={(v) => toggleLike(v.hash)}
                onToggleElite={(v) => toggleElite(v.hash)}
                emptyMessage="暂无精品视频，在播放器点击五角星收藏"
            />
        </Box>
    );
}