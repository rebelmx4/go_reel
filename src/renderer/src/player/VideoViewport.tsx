import { Box } from '@mantine/core';
import { usePlayerStore } from '../stores';
import { useVideoVisuals } from './hooks';
import { useVideoContext } from './contexts';


interface VideoViewportProps {
    videoSrc: string;
    onTimeUpdate: (time: number) => void;
}

export function VideoViewport({ videoSrc, onTimeUpdate }: VideoViewportProps) {
    const { videoRef, containerRef } = useVideoContext();
    const { rotation, isPlaying, setPlaying, setDuration } = usePlayerStore();

    // 视觉变换逻辑
    const { onVisualLoadedMetadata } = useVideoVisuals({ rotation });


    // 防止播放循环的 handler
    const handleVideoPlay = () => { if (!usePlayerStore.getState().isPlaying) setPlaying(true); };
    const handleVideoPause = () => {
        const v = videoRef.current;
        if (v && v.readyState > 0 && usePlayerStore.getState().isPlaying) {
            setPlaying(false);
        }
    };

    return (
        <Box
            ref={containerRef}
            style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}
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
                    setPlaying(true);
                }}
            />
        </Box>
    );
}