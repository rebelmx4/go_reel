import { useRef, useState, useEffect } from 'react';
import { Box } from '@mantine/core';
import { usePlayerStore } from '../stores';

interface ProgressBarWithThumbnailProps {
    videoPath: string | null;
    onSeek: (time: number) => void;
}

export function ProgressBarWithThumbnail({
    videoPath,
    onSeek
}: ProgressBarWithThumbnailProps) {
    const progressRef = useRef<HTMLDivElement>(null);
    const thumbnailVideoRef = useRef<HTMLVideoElement>(null);

    const [showThumbnail, setShowThumbnail] = useState(false);
    const [thumbnailPosition, setThumbnailPosition] = useState(0);
    const [thumbnailTime, setThumbnailTime] = useState(0);

    const currentTime = usePlayerStore(state => state.currentTime);
    const duration = usePlayerStore(state => state.duration);

    // 1. 初始化加载：只在路径变化时执行一次
    useEffect(() => {
        const video = thumbnailVideoRef.current;
        if (video && videoPath) {
            const fileUrl = `file:///${videoPath.replace(/\\/g, '/')}`;
            console.log("Thumbnail video source set:", fileUrl);
            video.src = fileUrl;
            video.load();
        }
    }, [videoPath]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const progress = progressRef.current;
        const video = thumbnailVideoRef.current;
        if (!progress || !video || !duration) return;

        const rect = progress.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const time = percentage * duration;

        setThumbnailPosition(x);
        setThumbnailTime(time);

        // 关键：只有当视频元数据加载完成后才进行 Seek
        if (video.readyState >= 1) {
            video.currentTime = time;
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <Box style={{ position: 'relative', width: '100%' }}>

            {/* 
               注意：我们将预览框放在这里，但不使用 {showThumbnail && ...} 
               而是通过 opacity 和 visibility 来控制显隐。
               这样里面的 <video> 标签会一直保持加载状态，不会被销毁。
            */}
            <Box
                style={{
                    position: 'absolute',
                    bottom: 30,
                    left: thumbnailPosition,
                    transform: 'translateX(-50%)',
                    width: 240, // 稍微大一点，方便观察
                    backgroundColor: '#000',
                    border: '2px solid #fff',
                    borderRadius: 4,
                    overflow: 'hidden',
                    zIndex: 100,
                    pointerEvents: 'none',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
                    // 核心修改：控制显隐但不销毁
                    opacity: showThumbnail ? 1 : 0,
                    visibility: showThumbnail ? 'visible' : 'hidden',
                    transition: 'opacity 0.1s ease-in-out'
                }}
            >
                <video
                    ref={thumbnailVideoRef}
                    muted
                    preload="auto"
                    style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        backgroundColor: '#000'
                    }}
                />
                <Box
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: '#fff',
                        fontSize: 12,
                        textAlign: 'center',
                        padding: '4px 0',
                        fontWeight: 'bold'
                    }}
                >
                    {formatTime(thumbnailTime)}
                </Box>
            </Box>

            {/* 进度条轨道 */}
            <Box
                ref={progressRef}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setShowThumbnail(true)}
                onMouseLeave={() => setShowThumbnail(false)}
                onClick={(e) => {
                    const rect = progressRef.current?.getBoundingClientRect();
                    if (rect && duration) {
                        const x = e.clientX - rect.left;
                        onSeek((x / rect.width) * duration);
                    }
                }}
                style={{
                    height: 12,
                    backgroundColor: '#333',
                    borderRadius: 6,
                    cursor: 'pointer',
                    position: 'relative',
                    marginTop: '20px'
                }}
            >
                <Box
                    style={{
                        height: '100%',
                        width: `${progressPercentage}%`,
                        backgroundColor: '#ff0000',
                        borderRadius: 6,
                        pointerEvents: 'none',
                    }}
                />
            </Box>
        </Box>
    );
}