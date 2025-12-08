import { Box, Text } from '@mantine/core';
import { VideoFile } from '../../stores';
import { VideoCard } from './VideoCard';

interface VideoGridProps {
    videos: VideoFile[];
    onPlay: (video: VideoFile) => void;
    onToggleLike?: (video: VideoFile) => void;
    onToggleElite?: (video: VideoFile) => void;
    emptyMessage?: string;
}

export function VideoGrid({
    videos,
    onPlay,
    onToggleLike,
    onToggleElite,
    emptyMessage = '暂无视频'
}: VideoGridProps) {
    if (videos.length === 0) {
        return (
            <Box
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: 400,
                }}
            >
                <Text c="dimmed" size="lg">{emptyMessage}</Text>
            </Box>
        );
    }

    return (
        <Box
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: 16,
                padding: 20,
            }}
        >
            {videos.map(video => (
                <VideoCard
                    key={video.id}
                    video={video}
                    onPlay={onPlay}
                    onToggleLike={onToggleLike}
                    onToggleElite={onToggleElite}
                />
            ))}
        </Box>
    );
}
