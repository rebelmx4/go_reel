import { Box, Text } from '@mantine/core';
import { IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { useClipStore, usePlayerStore, useScreenshotStore } from '../stores';
import { useEffect, useRef } from 'react';
import { useVideoContext } from './contexts';
import { formatDuration } from '../utils/format';


export function ClipTrack() {
    const clips = useClipStore((state) => state.clips);
    const toggleClipState = useClipStore((state) => state.toggleClipState);
    const setIsEditing = useClipStore(state => state.setIsEditing);

    const duration = usePlayerStore((state) => state.duration);
    const currentTime = usePlayerStore((state) => state.currentTime);

    const screenshots = useScreenshotStore((state) => state.screenshots);
    const { videoRef } = useVideoContext();

    const containerRef = useRef<HTMLDivElement>(null);
    const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setIsEditing(true);
        return () => setIsEditing(false);
    }, []);

    // --- 处理单击 (跳转) 与 双击 (切换状态) 的冲突 ---
    const handleClipClick = (e: React.MouseEvent, clip: any) => {
        if (!videoRef.current || !containerRef.current) return;

        // 如果已经有定时器，说明是正在判定的第二次点击，交给双击逻辑处理
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            return;
        }

        // 设置延迟判定
        const { clientX } = e;
        const isCtrl = e.ctrlKey;

        clickTimerRef.current = setTimeout(() => {
            const video = videoRef.current!;
            if (isCtrl) {
                video.currentTime = clip.startTime;
            } else {
                const rect = containerRef.current!.getBoundingClientRect();
                const clickX = clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                video.currentTime = percentage * duration;
            }
            clickTimerRef.current = null;
        }, 250); // 250ms 是单击判定的阈值
    };

    const handleClipDoubleClick = (clipId: string) => {
        // 双击发生时，清除单击定时器，防止进度跳转
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
        }
        toggleClipState(clipId);
    };

    const hasScreenshots = (clip: any) => {
        return screenshots.some(s => s.timestamp >= clip.startTime && s.timestamp <= clip.endTime);
    };

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
                    position: 'relative'
                }}
            >
                {clips.map((clip) => (
                    <Box
                        key={clip.id}
                        onClick={(e) => handleClipClick(e, clip)}
                        onDoubleClick={() => handleClipDoubleClick(clip.id)}
                        style={{
                            width: `${((clip.endTime - clip.startTime) / duration) * 100}%`,
                            backgroundColor: clip.state === 'keep' ? '#2a4a2a' : '#4a2a2a',
                            borderRight: '1px solid #555',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {clip.state === 'remove' && (
                            <Box style={{ display: 'flex', gap: 4 }}>
                                {hasScreenshots(clip) && <IconAlertTriangle size={14} color="#ffa500" />}
                                <IconTrash size={14} color="#ff6b6b" />
                            </Box>
                        )}
                        <Text size="8px" style={{ position: 'absolute', bottom: 1, left: 2, opacity: 0.5, pointerEvents: 'none' }}>
                            {formatDuration(clip.startTime)}
                        </Text>
                    </Box>
                ))}

                {/* 游标 */}
                <Box
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${playheadPosition}%`,
                        width: '2px',
                        backgroundColor: '#fff',
                        boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }}
                />
            </Box>
        </Box>
    );
}