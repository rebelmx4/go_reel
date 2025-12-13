import { useEffect } from 'react';
import { Box, Text } from '@mantine/core';
import { useVideoStore, usePlayerStore, useNavigationStore, usePlaylistStore } from '../stores';
import { CoverGrid } from '../components/Video/CoverGrid';

export function NewestPage() {
    const videos = useVideoStore((state) => state.getNewestVideos());
    const loadVideos = useVideoStore((state) => state.loadVideos);
    const updateLastPlayed = useVideoStore((state) => state.updateLastPlayed);

    const setCurrentVideo = usePlayerStore((state) => state.setCurrentVideo);
    const setView = useNavigationStore((state) => state.setView);

    useEffect(() => {
        loadVideos();
    }, [loadVideos]);

    const handlePlay = (video: any) => {
        setCurrentVideo(video.path);
        // updateLastPlayed(video.id);
        setView('player');
    };

    return (
        <Box style={{ height: '100%', overflow: 'auto' }}>
            <Box style={{ padding: '20px 20px 0 20px' }}>
                <Text size="xl" fw={700} mb={4}>最新视频</Text>
                <Text size="sm" c="dimmed" mb={16}>
                    按创建时间排序
                </Text>
            </Box>

            <CoverGrid
                videos={videos}
                onPlay={handlePlay}
                emptyMessage="暂无视频"
            />
        </Box>
    );
}
