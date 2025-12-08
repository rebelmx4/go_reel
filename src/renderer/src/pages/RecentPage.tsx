import { useEffect } from 'react';
import { Box, Text } from '@mantine/core';
import { useVideoStore, usePlayerStore, useNavigationStore, usePlaylistStore } from '../stores';
import { VideoGrid } from '../components/Video/VideoGrid';

export function RecentPage() {
    const videos = useVideoStore((state) => state.getRecentVideos());
    const loadVideos = useVideoStore((state) => state.loadVideos);
    const toggleLike = useVideoStore((state) => state.toggleLike);
    const toggleElite = useVideoStore((state) => state.toggleElite);
    const updateLastPlayed = useVideoStore((state) => state.updateLastPlayed);

    const setCurrentVideo = usePlayerStore((state) => state.setCurrentVideo);
    const setView = useNavigationStore((state) => state.setView);

    const setPlaylistMode = usePlaylistStore((state) => state.setMode);
    const setPlaylist = usePlaylistStore((state) => state.setPlaylist);
    const setCurrentVideoId = usePlaylistStore((state) => state.setCurrentVideo);

    useEffect(() => {
        loadVideos();
        setPlaylistMode('recent');
    }, [loadVideos, setPlaylistMode]);

    useEffect(() => {
        setPlaylist(videos);
    }, [videos, setPlaylist]);

    const handlePlay = (video: any) => {
        setCurrentVideo(video.path);
        setCurrentVideoId(video.id);
        updateLastPlayed(video.id);
        setView('player');
    };

    return (
        <Box style={{ height: '100%', overflow: 'auto' }}>
            <Box style={{ padding: '20px 20px 0 20px' }}>
                <Text size="xl" fw={700} mb={4}>最近播放</Text>
                <Text size="sm" c="dimmed" mb={16}>
                    按最后播放时间排序
                </Text>
            </Box>

            <VideoGrid
                videos={videos}
                onPlay={handlePlay}
                onToggleLike={(v) => toggleLike(v.id)}
                onToggleElite={(v) => toggleElite(v.id)}
                emptyMessage="暂无播放记录"
            />
        </Box>
    );
}
