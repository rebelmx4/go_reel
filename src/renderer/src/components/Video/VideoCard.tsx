import { useIntersection } from '@mantine/hooks';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Image, Text, ActionIcon, Group, Tooltip } from '@mantine/core';
import { IconHeart, IconHeartFilled, IconStar, IconStarFilled } from '@tabler/icons-react';
import { IconFolderOpen, IconTrash } from '@tabler/icons-react';
import { VideoFile } from '../../../../shared/models';
import { useFileActions } from '../../hooks/useFileActions';
import { formatRelativeTime, formatFileSize } from '../../utils/format';

interface VideoCardProps {
    video: VideoFile;
    onPlay: (video: VideoFile) => void;
    onToggleLike?: (video: VideoFile) => void;
    onToggleElite?: (video: VideoFile) => void;
}

export function VideoCard({ video, onPlay, onToggleLike, onToggleElite }: VideoCardProps) {
    const [coverUrl, setCoverUrl] = useState<string>('');
    const { handleShowInExplorer, handleDelete } = useFileActions();
    const [isLoadingCover, setIsLoadingCover] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 从路径派生文件名
    const filename = useMemo(() => {
        return video.path.replace(/\\/g, '/').split('/').pop() || 'Unknown Video';
    }, [video.path]);

    // 转换本地文件路径为 file 协议 URL
    const videoSrc = useMemo(() => {
        const normalizedPath = video.path.replace(/\\/g, '/');
        return `file:///${normalizedPath}`;
    }, [video.path]);

    const isLiked = (video.annotation?.like_count ?? 0) > 0;
    const isFavorite = !!video.annotation?.is_favorite;

    const { ref, entry } = useIntersection({
        root: null,
        threshold: 0.1,
    });

    const [hasBeenVisible, setHasBeenVisible] = useState(false);

    useEffect(() => {
        if (entry?.isIntersecting) {
            setHasBeenVisible(true);
        }
    }, [entry?.isIntersecting]);

    // 加载封面
    useEffect(() => {
        if (!hasBeenVisible) return;
        let isMounted = true;
        setIsLoadingCover(true);
        window.api.getCover(video.path).then(url => {
            if (isMounted) {
                setCoverUrl(url);
                setIsLoadingCover(false);
            }
        });
        return () => { isMounted = false; };
    }, [video.path, hasBeenVisible]);

    // 处理悬停逻辑
    const handleMouseEnter = () => {
        // 设置一个小延迟，防止快速划过时频繁触发视频加载
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(true);
        }, 200);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(false);
        setProgress(0);
    };

    // 视频进度更新
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const total = videoRef.current.duration;
            if (total > 0) {
                setProgress((current / total) * 100);
            }
        }
    };

    // 进度条点击跳转
    const handleProgressClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止触发卡片的 onPlay
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const clickedPercent = x / rect.width;
            videoRef.current.currentTime = clickedPercent * videoRef.current.duration;
        }
    };

    return (
        <Tooltip label={filename} position="top" withArrow openDelay={500}>
            <Box
                className="video-card"
                ref={ref}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={() => onPlay(video)}
                style={{
                    position: 'relative',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '2px solid #2C2E33',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    backgroundColor: '#1A1B1E',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* 媒体区域 */}
                <Box style={{ position: 'relative', paddingTop: '56.25%', backgroundColor: '#000' }}>
                    <Box style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                        {/* 封面图：在视频未播放或加载时显示 */}
                        <Image
                            src={coverUrl}
                            alt={filename}
                            height="100%"
                            fit="contain"
                            style={{
                                display: (isHovered && !isLoadingCover) ? 'none' : 'block',
                                opacity: isLoadingCover ? 0.5 : 1
                            }}
                            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23333' width='300' height='200'/%3E%3C/text%3E%3C/svg%3E"
                        />

                        {/* 预览视频 */}
                        {isHovered && (
                            <video
                                ref={videoRef}
                                src={videoSrc}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0
                                }}
                                autoPlay
                                muted
                                loop
                                playsInline
                                onTimeUpdate={handleTimeUpdate}
                            />
                        )}
                    </Box>

                    {/* 预览进度条 */}
                    {isHovered && (
                        <Box
                            onClick={handleProgressClick}
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: 8,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                zIndex: 20,
                                cursor: 'pointer'
                            }}
                        >
                            <Box
                                style={{
                                    width: `${progress}%`,
                                    height: '100%',
                                    backgroundColor: 'var(--mantine-color-blue-filled)',
                                    transition: 'width 0.1s linear'
                                }}
                            />
                        </Box>
                    )}

                    {/* 管理按钮 */}
                    <Group
                        gap={4}
                        style={{
                            position: 'absolute', top: 5, right: 5, zIndex: 10,
                            backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: 2
                        }}
                    >
                        <Tooltip label="打开所在文件夹" position="bottom">
                            <ActionIcon
                                variant="subtle" color="gray.3" size="sm"
                                onClick={(e) => { e.stopPropagation(); handleShowInExplorer(video.path); }}
                            >
                                <IconFolderOpen size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="移至待删除" position="bottom">
                            <ActionIcon
                                variant="subtle" color="red.5" size="sm"
                                onClick={(e) => { e.stopPropagation(); handleDelete(video); }}
                            >
                                <IconTrash size={16} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>

                    {/* 精品标记 */}
                    {isFavorite && (
                        <Box
                            style={{
                                position: 'absolute', top: 6, left: 6,
                                backgroundColor: 'rgba(255, 215, 0, 0.95)',
                                color: '#000', padding: '2px 8px', borderRadius: 4,
                                fontSize: 10, fontWeight: 'bold', zIndex: 5
                            }}
                        >
                            精品
                        </Box>
                    )}
                </Box>

                {/* 信息区域 (移除了文件名，保留元数据和点赞) */}
                <Box style={{ padding: '8px 12px', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                    <Group justify="space-between" align="center" style={{ width: '100%' }} wrap="nowrap">
                        <Box style={{ minWidth: 0 }}>
                            <Text size="xs" c="dimmed">
                                {formatRelativeTime(video.mtime)} • {formatFileSize(video.size)}
                            </Text>
                        </Box>

                        <Group gap={4} style={{ flexShrink: 0 }}>
                            <ActionIcon
                                variant="subtle"
                                size="sm"
                                color={isLiked ? 'red' : 'gray'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLike?.(video);
                                }}
                            >
                                {isLiked ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                            </ActionIcon>
                            <ActionIcon
                                variant="subtle"
                                size="sm"
                                color={isFavorite ? 'yellow' : 'gray'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleElite?.(video);
                                }}
                            >
                                {isFavorite ? <IconStarFilled size={18} /> : <IconStar size={18} />}
                            </ActionIcon>
                        </Group>
                    </Group>
                </Box>
            </Box>
        </Tooltip>
    );
}