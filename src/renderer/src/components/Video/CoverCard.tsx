import { useEffect, useState } from 'react';
import { Card, Image, ActionIcon, Box, Center, Loader, Text } from '@mantine/core'; // 1. 导入 Loader 并移除 RingProgress
import { IconPlayerPlay, IconHeart, IconCrown } from '@tabler/icons-react';
import { VideoFile } from '../../stores/videoStore';
import classes from './CoverCard.module.css';

interface CoverCardProps {
    video: VideoFile;
    onPlay: (video: VideoFile) => void;
}

export function CoverCard({ video, onPlay }: CoverCardProps) {
    const [coverUrl, setCoverUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;
        const fetchCover = async () => {
            setIsLoading(true);
            setError(false);

            try {
                const url = await window.api.getCover(video.hash, video.path);
                if (isMounted) {
                    setCoverUrl(url);
                }
            } catch (err) {
                console.error(`Failed to load cover for ${video.hash}:`, err);
                if (isMounted) {
                    setError(true);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchCover();

        return () => {
            isMounted = false;
        };
    }, [video.hash, video.path]);

    const handlePlayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPlay(video);
    };

    return (
        <Card withBorder padding="sm" radius="md" className={classes.card}>
            <Card.Section className={classes.imageSection}>
                {isLoading ? (
                    <Center style={{ height: '100%' }}>
                        {/* 2. 将 RingProgress 替换为 Loader */}
                        <Loader size="sm" />
                    </Center>
                ) : error ? (
                    <Center style={{ height: '100%', flexDirection: 'column' }}>
                        <Text c="dimmed" size="xs">封面加载失败</Text>
                    </Center>
                ) : (
                    <Image src={coverUrl} alt="Video cover" className={classes.image} />
                )}

                <Box className={classes.overlay} onClick={() => onPlay(video)} />

                <ActionIcon
                    className={classes.playButton}
                    variant="filled"
                    color="rgba(255, 255, 255, 0.7)"
                    size="lg"
                    radius="xl"
                    onClick={handlePlayClick}
                >
                    <IconPlayerPlay size={24} color='black' />
                </ActionIcon>

                <Box className={classes.iconGroup}>
                    <ActionIcon
                        variant="transparent"
                    >
                        <IconHeart size={18} fill={video.liked ? 'red' : 'none'} color={video.liked ? 'red' : 'white'} />
                    </ActionIcon>
                    <ActionIcon
                        variant="transparent"
                    >
                        <IconCrown size={18} fill={video.elite ? 'gold' : 'none'} color={video.elite ? 'gold' : 'white'} />
                    </ActionIcon>
                </Box>
            </Card.Section>
        </Card>
    );
}