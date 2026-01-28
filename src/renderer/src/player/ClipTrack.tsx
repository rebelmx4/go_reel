import { Box, Text, Button } from '@mantine/core';
import { IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { useClipStore } from '../stores/clipStore';
import { usePlayerStore, useScreenshotStore, usePlaylistStore } from '../stores';
import { useEffect, useRef } from 'react';

export function ClipTrack() {
    const clips = useClipStore((state) => state.clips);
    const toggleClipState = useClipStore((state) => state.toggleClipState);

    const duration = usePlayerStore((state) => state.duration);
    const currentTime = usePlayerStore((state) => state.currentTime); // 引入当前时间
    const toggleClipTrack = usePlayerStore((state) => state.toggleClipTrack);

    const screenshots = useScreenshotStore((state) => state.screenshots);
    const setIsEditing = useClipStore(state => state.setIsEditing);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsEditing(true);
        return () => setIsEditing(false);
    }, []);

    const handleClipClick = (e: React.MouseEvent, clip: any) => {
        const videoElement = document.querySelector('video');
        if (!videoElement || !containerRef.current) return;

        if (e.ctrlKey) {
            // Ctrl + 点击：跳转到片段开头
            videoElement.currentTime = clip.startTime;
        } else {
            // 普通点击：像进度条一样跳转到点击位置
            const rect = containerRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
            videoElement.currentTime = percentage * duration;
        }
    };

    const handleExecute = async () => {
        const currentPath = usePlaylistStore.getState().currentPath;
        if (!currentPath) return;
        try {
            const result = await window.api.updateAnnotation(currentPath, { clips });
            if (result.success) {
                toggleClipTrack();
            }
        } catch (error) {
            console.error('Save failed', error);
        }
    };

    const formatTime = (time: number) => {
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const hasScreenshots = (clip: any) => {
        return screenshots.some(s => s.timestamp >= clip.startTime && s.timestamp <= clip.endTime);
    };

    // 计算游标位置
    const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (clips.length === 0) return null;

    return (
        <Box style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
            <Box
                ref={containerRef}
                style={{
                    flex: 1,
                    display: 'flex',
                    height: 36,
                    backgroundColor: '#0a0a0a',
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid #444',
                    position: 'relative' // 必须为 relative 以便游标绝对定位
                }}
            >
                {/* 1. 渲染片段色块 */}
                {clips.map((clip) => (
                    <Box
                        key={clip.id}
                        onClick={(e) => handleClipClick(e, clip)}
                        onDoubleClick={() => toggleClipState(clip.id)}
                        style={{
                            width: `${((clip.endTime - clip.startTime) / duration) * 100}%`,
                            backgroundColor: clip.state === 'keep' ? '#2a4a2a' : '#4a2a2a',
                            borderRight: '1px solid #555',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                        }}
                    >
                        {clip.state === 'remove' && (
                            <Box style={{ display: 'flex', gap: 4 }}>
                                {hasScreenshots(clip) && <IconAlertTriangle size={14} color="#ffa500" />}
                                <IconTrash size={14} color="#ff6b6b" />
                            </Box>
                        )}
                        <Text size="8px" style={{ position: 'absolute', bottom: 1, left: 2, opacity: 0.5, pointerEvents: 'none' }}>
                            {formatTime(clip.startTime)}
                        </Text>
                    </Box>
                ))}

                {/* 2. 渲染游标 (Playhead) */}
                <Box
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${playheadPosition}%`,
                        width: '2px',
                        backgroundColor: '#fff',
                        boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                        zIndex: 10,
                        pointerEvents: 'none', // 穿透点击
                        transition: 'none' // 实时更新，不需要过渡动画
                    }}
                />
            </Box>

            <Button size="xs" color="green" variant="light" onClick={handleExecute} style={{ height: 36 }}>
                保存裁剪
            </Button>
        </Box>
    );
}