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

    // 引入 handleWheel
    const { onVisualLoadedMetadata, handleWheel } = useVideoVisuals({ rotation });

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
            <video
                ref={videoRef}
                src={videoSrc}
                style={{
                    // 关键修改：取消 object-fit: contain，使用手动控制
                    display: 'block',
                    maxWidth: 'none',
                    pointerEvents: 'none',
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-out' // 稍微缩短时间，让缩放更跟手
                }}
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