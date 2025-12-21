import { useState, useEffect, useMemo } from 'react';
import { Box, Image, Text, ActionIcon, Group, Skeleton } from '@mantine/core';
import { IconHeart, IconHeartFilled, IconStar, IconStarFilled, IconPlayerPlay } from '@tabler/icons-react';
import { VideoFile } from '../../stores';

interface VideoCardProps {
    video: VideoFile;
    onPlay: (video: VideoFile) => void;
    onToggleLike?: (video: VideoFile) => void;
    onToggleElite?: (video: VideoFile) => void;
}

export function VideoCard({ video, onPlay, onToggleLike, onToggleElite }: VideoCardProps) {
    // 状态：封面图 URL
    const [coverUrl, setCoverUrl] = useState<string>('');
    // 状态：元数据 (时长/尺寸)，如果 VideoFile 中没有，则需异步获取
    const [metaData, setMetaData] = useState<{ duration: number; size?: number }>({
        duration: (video as any).duration || 0, // 尝试从已有对象读取
        size: (video as any).size || 0
    });
    const [isLoadingCover, setIsLoadingCover] = useState(true);

    // 从路径派生文件名
    const filename = useMemo(() => {
        return video.path.replace(/\\/g, '/').split('/').pop() || video.hash;
    }, [video.path, video.hash]);

    // 加载封面和元数据
    useEffect(() => {
        let isMounted = true;
        setIsLoadingCover(true);

        const loadData = async () => {
            try {
                // 1. 获取封面 (IPC)
                if (window.api?.getCover) {
                    const url = await window.api.getCover(video.hash, video.path);
                    if (isMounted) setCoverUrl(url);
                }

                // 2. 获取元数据 (如果 VideoFile 里缺数据)
                // 注意：如果列表很长，每个卡片都调用 getVideoMetadata 可能会有性能压力
                // 建议后期在 scanner 阶段就存入 duration
                if (metaData.duration === 0 && window.api?.getVideoMetadata) {
                    const meta = await window.api.getVideoMetadata(video.path);
                    if (isMounted) {
                        setMetaData(prev => ({ ...prev, duration: meta.duration }));
                    }
                }
            } catch (error) {
                console.error(`Failed to load data for ${filename}`, error);
            } finally {
                if (isMounted) setIsLoadingCover(false);
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [video.hash, video.path, filename]); // metaData.duration 不放依赖里防止循环

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    };

    const formatDate = (timestamp: number) => {
        if (!timestamp) return '';
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
                border: '2px solid #2C2E33', // Mantine dark theme default border colorish
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                backgroundColor: '#1A1B1E', // Mantine dark.7
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--mantine-color-green-filled)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2C2E33';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => onPlay(video)}
        >
            {/* Thumbnail Section */}
            <Box style={{ position: 'relative', paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
                <Box style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    {isLoadingCover ? (
                        <Skeleton height="100%" radius={0} />
                    ) : (
                        <Image
                            src={coverUrl}
                            alt={filename}
                            height="100%"
                            fit="cover"
                            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23333' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-family='sans-serif'%3ENo Cover%3C/text%3E%3C/svg%3E"
                        />
                    )}
                </Box>

                {/* Play overlay */}
                <Box
                    className="play-overlay"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                >
                    <IconPlayerPlay size={48} color="#fff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                </Box>

                {/* Duration badge */}
                <Box
                    style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        pointerEvents: 'none'
                    }}
                >
                    {formatDuration(metaData.duration)}
                </Box>

                {/* Elite badge */}
                {video.elite && (
                    <Box
                        style={{
                            position: 'absolute',
                            top: 6,
                            left: 6,
                            backgroundColor: 'rgba(255, 215, 0, 0.95)',
                            color: '#000',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}
                    >
                        精品
                    </Box>
                )}
            </Box>

            {/* Info Section */}
            <Box style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Text
                    size="sm"
                    fw={600}
                    style={{
                        marginBottom: 8,
                        lineHeight: 1.3,
                        height: '2.6em', // Limit to 2 lines usually, or just use lineClamp
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        wordBreak: 'break-all'
                    }}
                    title={filename}
                >
                    {filename}
                </Text>

                <Group justify="space-between" align="end" wrap="nowrap">
                    <Box style={{ minWidth: 0 }}>
                        <Text size="xs" c="dimmed" truncate>
                            {formatDate(video.createdAt)}
                            {metaData.size ? ` • ${formatSize(metaData.size)}` : ''}
                        </Text>

                        {/* 兼容处理：只有当 VideoFile 扩展了 lastPlayedAt 时才显示 */}
                        {(video as any).lastPlayedAt && (
                            <Text size="xs" c="dimmed" truncate>
                                上次播放: {formatDate((video as any).lastPlayedAt)}
                            </Text>
                        )}
                    </Box>

                    <Group gap={4} style={{ flexShrink: 0 }}>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
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
                            size="sm"
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