// src/renderer/src/player/VideoViewport.tsx
import { Box } from '@mantine/core';
import { usePlayerStore } from '../stores';
import { useVideoVisuals, useVideoCrop } from './hooks';

interface VideoViewportProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
    videoSrc: string;
    onCropComplete: (base64: string) => void;
    onTimeUpdate: (time: number) => void;
}

export function VideoViewport({ videoRef, containerRef, videoSrc, onCropComplete, onTimeUpdate }: VideoViewportProps) {
    const { rotation, isPlaying, setPlaying, setDuration } = usePlayerStore();

    // 视觉变换逻辑
    const { onVisualLoadedMetadata } = useVideoVisuals({ videoRef, containerRef, rotation });

    // 框选逻辑
    const { handleMouseDown, handleMouseMove, handleMouseUp, cropRect, isDragging } = useVideoCrop(
        videoRef, containerRef, rotation, onCropComplete
    );

    // 防止播放循环的 handler
    const handleVideoPlay = () => { if (!usePlayerStore.getState().isPlaying) setPlaying(true); };
    const handleVideoPause = () => { if (usePlayerStore.getState().isPlaying) setPlaying(false); };

    return (
        <Box
            ref={containerRef}
            style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'crosshair' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDoubleClick={() => setPlaying(!isPlaying)}
        >
            <video
                ref={videoRef}
                src={videoSrc}
                style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', transformOrigin: 'center center' }}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onTimeUpdate={() => onTimeUpdate(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => {
                    setDuration(videoRef.current?.duration || 0);
                    onVisualLoadedMetadata();
                }}
            />
            {isDragging && cropRect && (
                <Box style={{
                    position: 'absolute',
                    left: Math.min(cropRect.startX, cropRect.currX),
                    top: Math.min(cropRect.startY, cropRect.currY),
                    width: Math.abs(cropRect.currX - cropRect.startX),
                    height: Math.abs(cropRect.currY - cropRect.startY),
                    border: '1.5px solid #00ff00',
                    backgroundColor: 'rgba(0, 255, 0, 0.15)',
                    pointerEvents: 'none',
                    zIndex: 100
                }} />
            )}
        </Box>
    );
}