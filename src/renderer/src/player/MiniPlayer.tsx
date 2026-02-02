// src/renderer/src/player/MiniPlayer.tsx
import { useRef, useState, useEffect } from 'react';
import { Box, ActionIcon, Group, Slider, Text, Stack } from '@mantine/core';
import { IconVolume, IconVolumeOff, IconX, IconPlayerPlay, IconPlayerPause } from '@tabler/icons-react';

interface MiniPlayerProps {
    path: string;
    onClose: () => void;
    gridSpan?: number; // 用于处理最后一行铺满
}

export function MiniPlayer({ path, onClose, gridSpan = 1 }: MiniPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true); // 默认静音以支持自动播放
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (videoRef.current?.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current?.pause();
            setIsPlaying(false);
        }
    };

    return (
        <Box style={{
            position: 'relative',
            backgroundColor: '#000',
            height: '100%',
            width: '100%',
            gridColumn: `span ${gridSpan}`,
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* 视频主体 */}
            <Box style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                <video
                    ref={videoRef}
                    src={`file://${path}`}
                    autoPlay
                    muted={isMuted}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                    onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={togglePlay}
                />

                {/* 右上角关闭按钮 */}
                <ActionIcon
                    variant="filled"
                    color="red"
                    size="sm"
                    onClick={onClose}
                    style={{ position: 'absolute', top: 5, right: 5, zIndex: 10, opacity: 0.7 }}
                >
                    <IconX size={14} />
                </ActionIcon>
            </Box>

            {/* 底部控制条 */}
            <Box p="xs" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                <Stack gap={4}>
                    <Slider
                        size="xs"
                        max={duration}
                        value={currentTime}
                        onChange={(val) => {
                            if (videoRef.current) videoRef.current.currentTime = val;
                        }}
                        label={null}
                    />
                    <Group justify="space-between">
                        <Group gap={8}>
                            <ActionIcon variant="subtle" size="sm" onClick={togglePlay}>
                                {isPlaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
                            </ActionIcon>
                            <ActionIcon variant="subtle" size="sm" onClick={() => setIsMuted(!isMuted)}>
                                {isMuted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
                            </ActionIcon>
                        </Group>
                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                            {path.split(/[\\/]/).pop()}
                        </Text>
                    </Group>
                </Stack>
            </Box>
        </Box>
    );
}