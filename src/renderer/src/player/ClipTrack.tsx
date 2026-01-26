import { Box, Group, Text, Button, ActionIcon, Tooltip } from '@mantine/core';
import { IconTrash, IconAlertTriangle, IconPlayerPlay } from '@tabler/icons-react';
import { useClipStore } from '../stores/clipStore';
import { usePlayerStore, useScreenshotStore, usePlaylistStore } from '../stores';
import { useEffect } from 'react';

export function ClipTrack() {
    const clips = useClipStore((state) => state.clips);
    const initializeClips = useClipStore((state) => state.initializeClips);
    const splitClip = useClipStore((state) => state.splitClip);
    const toggleClipState = useClipStore((state) => state.toggleClipState);
    const mergeClip = useClipStore((state) => state.mergeClip);

    const duration = usePlayerStore((state) => state.duration);
    const currentTime = usePlayerStore((state) => state.currentTime);
    const screenshots = useScreenshotStore((state) => state.screenshots);
    const setIsEditing = useClipStore(state => state.setIsEditing);

    // Initialize clips when duration changes
    useEffect(() => {
        if (duration > 0 && clips.length === 0) {
            initializeClips(duration);
        }
    }, [duration, clips.length, initializeClips]);

    useEffect(() => {
        setIsEditing(true);
        return () => setIsEditing(false);
    }, []);



    // Handle Q key for splitting
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'q' || e.key === 'Q') {
                // Find clip at current time
                const clip = clips.find(c => currentTime >= c.startTime && currentTime <= c.endTime);
                if (clip) {
                    splitClip(clip.id, currentTime);
                }
            } else if (e.key === 'Delete') {
                // Find clip at current time and merge it
                const clip = clips.find(c => currentTime >= c.startTime && currentTime <= c.endTime);
                if (clip) {
                    mergeClip(clip.id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [clips, currentTime, splitClip, mergeClip]);

    const handleClipClick = (clip: any, isCtrlClick: boolean) => {
        const videoElement = document.querySelector('video');
        if (videoElement) {
            videoElement.currentTime = isCtrlClick ? clip.endTime : clip.startTime;
            videoElement.pause();
        }
    };

    const handleClipDoubleClick = (clipId: string) => {
        toggleClipState(clipId);
    };

    const handleExecute = async () => {
        const currentPath = usePlaylistStore.getState().currentPath;
        if (!currentPath) return;

        if (confirm('确认保存裁剪配置？保存后播放将自动跳过标记为删除的片段。')) {
            try {
                // 将当前的 clips 数组保存到数据库/文件的 annotation 中
                const result = await window.api.updateAnnotation(currentPath, {
                    clips: clips
                });

                if (result.success) {
                    alert('裁剪配置已保存！');
                }
            } catch (error) {
                alert(`保存失败：${error}`);
            }
        }
    };

    const formatTime = (time: number) => {
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getClipWidth = (clip: any) => {
        return ((clip.endTime - clip.startTime) / duration) * 100;
    };

    const hasScreenshots = (clip: any) => {
        return screenshots.some(s => s.timestamp >= clip.startTime && s.timestamp <= clip.endTime);
    };

    if (clips.length === 0) return null;

    return (
        <Box
            style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 4,
                padding: '10px',
                border: '1px solid #333',
            }}
        >
            <Group justify="space-between" mb={8}>
                <Text size="xs" c="dimmed">裁剪轨道 (Q: 分割 | 双击: 切换状态 | Delete: 合并)</Text>
                <Button size="xs" color="green" onClick={handleExecute}>
                    执行裁剪
                </Button>
            </Group>

            <Box
                style={{
                    display: 'flex',
                    height: 40,
                    backgroundColor: '#0a0a0a',
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid #444'
                }}
            >
                {clips.map((clip) => (
                    <Box
                        key={clip.id}
                        onClick={(e) => handleClipClick(clip, e.ctrlKey)}
                        onDoubleClick={() => handleClipDoubleClick(clip.id)}
                        style={{
                            width: `${getClipWidth(clip)}%`,
                            backgroundColor: clip.state === 'keep' ? '#2a4a2a' : '#4a2a2a',
                            border: '1px solid #555',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = clip.state === 'keep' ? '#3a5a3a' : '#5a3a3a';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = clip.state === 'keep' ? '#2a4a2a' : '#4a2a2a';
                        }}
                    >
                        {clip.state === 'remove' && (
                            <Group gap={4}>
                                {hasScreenshots(clip) && (
                                    <Tooltip label="包含截图">
                                        <IconAlertTriangle size={16} color="#ffa500" />
                                    </Tooltip>
                                )}
                                <IconTrash size={16} color="#ff6b6b" />
                            </Group>
                        )}

                        <Text
                            size="xs"
                            style={{
                                position: 'absolute',
                                bottom: 2,
                                left: 2,
                                fontSize: 9,
                                opacity: 0.7
                            }}
                        >
                            {formatTime(clip.startTime)}
                        </Text>

                        <Text
                            size="xs"
                            style={{
                                position: 'absolute',
                                bottom: 2,
                                right: 2,
                                fontSize: 9,
                                opacity: 0.7
                            }}
                        >
                            {formatTime(clip.endTime)}
                        </Text>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
