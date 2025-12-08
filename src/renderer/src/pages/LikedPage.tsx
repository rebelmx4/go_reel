import { useEffect } from 'react';
import { Box, Text } from '@mantine/core';
import { useVideoStore, usePlayerStore, useNavigationStore, usePlaylistStore } from '../stores';
import { VideoGrid } from '../components/Video/VideoGrid';

export function LikedPage() {
    const videos = useVideoStore((state) => state.getLikedVideos());
    const loadVideos = useVideoStore((state) => state.loadVideos);
    const toggleLike = useVideoStore((state) => state.toggleLike);
    const toggleElite = useVideoStore((state) => state.toggleElite);
    const updateLastPlayed = useVideoStore((state) => state.updateLastPlayed);

    const setCurrentVideo = usePlayerStore((state) => state.setCurrentVideo);
    const setView = useNavigationStore((state) => state.setView);

    useEffect(() => {
        loadVideos();
    }, [loadVideos]);

    const handlePlay = (video: any) => {
        setCurrentVideo(video.path);
        updateLastPlayed(video.id);
        setView('player');
    };

    return (
        <Box style={{ height: '100%', overflow: 'auto' }}>
            <Box style={{ padding: '20px 20px 0 20px' }}>
                <Text size="xl" fw={700} mb={4}>点赞列表</Text>
                <Text size="sm" c="dimmed" mb={16}>
                    你喜欢的视频 ({videos.length})
                </Text>
            </Box>

            <VideoGrid
                videos={videos}
                onPlay={handlePlay}
                onToggleLike={(v) => toggleLike(v.id)}
                onToggleElite={(v) => toggleElite(v.id)}
                emptyMessage="暂无点赞的视频"
            />
        </Box>
    );
}
