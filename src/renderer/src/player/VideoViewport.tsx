import { Box } from '@mantine/core';
import { usePlayerStore } from '../stores';
import { useVideoVisuals } from './hooks';
import { useVideoContext } from './contexts';
import { ViewportTagOverlay } from './ViewportTagOverlay';
import { StoryboardStartOverlay } from './StoryboardStartOverlay';


interface VideoViewportProps {
    videoSrc: string;
    onTimeUpdate: (time: number) => void;
}

export function VideoViewport({ videoSrc, onTimeUpdate }: VideoViewportProps) {
    const { videoRef, containerRef } = useVideoContext();
    const { rotation, isPlaying, setPlaying, setDuration } = usePlayerStore();

    // 引入 handleWheel
    const { videoStyle, handleWheel, onVisualLoadedMetadata } = useVideoVisuals({ rotation });

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
            style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'default',
                backgroundColor: 'black'
            }}
            onDoubleClick={() => setPlaying(!isPlaying)}
            onWheel={handleWheel} // 绑定滚轮事件
        >
            <StoryboardStartOverlay />

            <video
                ref={videoRef}
                src={videoSrc}
                style={videoStyle}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onTimeUpdate={() => onTimeUpdate(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => {
                    setDuration(videoRef.current?.duration || 0);
                    onVisualLoadedMetadata(); // 这里会触发 opacity: 1
                    setPlaying(true);
                }}
            />

            <ViewportTagOverlay />
        </Box>
    );
}