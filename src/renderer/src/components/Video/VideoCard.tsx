import { Box, Image, Text, ActionIcon, Group } from '@mantine/core';
import { IconHeart, IconHeartFilled, IconStar, IconStarFilled, IconPlayerPlay } from '@tabler/icons-react';
import { VideoFile } from '../../stores';

interface VideoCardProps {
    video: VideoFile;
    onPlay: (video: VideoFile) => void;
    onToggleLike?: (video: VideoFile) => void;
    onToggleElite?: (video: VideoFile) => void;
}

export function VideoCard({ video, onPlay, onToggleLike, onToggleElite }: VideoCardProps) {
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatSize = (bytes: number) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays < 7) return `${diffDays}天前`;
        return date.toLocaleDateString('zh-CN');
    };

    return (
        <Box
            style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                border: '2px solid #444',
                transition: 'all 0.2s',
                cursor: 'pointer',
                backgroundColor: '#1a1a1a',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00ff00';
                e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#444';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={() => onPlay(video)}
        >
            {/* Thumbnail */}
            <Box style={{ position: 'relative' }}>
                <Image
                    src={video.thumbnail}
                    alt={video.filename}
                    fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23333' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23999'%3E视频缩略图%3C/text%3E%3C/svg%3E"
                    style={{
                        width: '100%',
                        aspectRatio: '16/9',
                        objectFit: 'cover',
                        backgroundColor: '#333',
                    }}
                />

                {/* Play overlay */}
                <Box
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                    }}
                >
                    <IconPlayerPlay size={48} color="#fff" />
                </Box>

                {/* Duration badge */}
                <Box
                    style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 12,
                    }}
                >
                    {formatDuration(video.duration)}
                </Box>

                {/* Elite badge */}
                {video.elite && (
                    <Box
                        style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            backgroundColor: 'rgba(255, 215, 0, 0.9)',
                            color: '#000',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 'bold',
                        }}
                    >
                        精品
                    </Box>
                )}
            </Box>

            {/* Info */}
            <Box style={{ padding: 12 }}>
                <Text
                    size="sm"
                    fw={600}
                    style={{
                        marginBottom: 8,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={video.filename}
                >
                    {video.filename}
                </Text>

                <Group justify="space-between" align="center">
                    <Box>
                        <Text size="xs" c="dimmed">
                            {formatSize(video.size)} • {formatDate(video.createdAt)}
                        </Text>
                        {video.lastPlayedAt && (
                            <Text size="xs" c="dimmed">
                                播放 {video.playCount} 次 • {formatDate(video.lastPlayedAt)}
                            </Text>
                        )}
                    </Box>

                    <Group gap={4}>
                        <ActionIcon
                            variant="subtle"
                            color={video.liked ? 'red' : 'gray'}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleLike?.(video);
                            }}
                        >
                            {video.liked ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                        </ActionIcon>
                        <ActionIcon
                            variant="subtle"
                            color={video.elite ? 'yellow' : 'gray'}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleElite?.(video);
                            }}
                        >
                            {video.elite ? <IconStarFilled size={18} /> : <IconStar size={18} />}
                        </ActionIcon>
                    </Group>
                </Group>
            </Box>
        </Box>
    );
}
