import { useRef, useEffect, useState } from 'react';
import { Box } from '@mantine/core';

interface ProgressBarWithThumbnailProps {
    currentTime: number;
    duration: number;
    videoPath: string | null;
    onSeek: (time: number) => void;
}

export function ProgressBarWithThumbnail({
    currentTime,
    duration,
    videoPath,
    onSeek
}: ProgressBarWithThumbnailProps) {
    const progressRef = useRef<HTMLDivElement>(null);
    const ghostVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [showThumbnail, setShowThumbnail] = useState(false);
    const [thumbnailPosition, setThumbnailPosition] = useState(0);
    const [thumbnailTime, setThumbnailTime] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);

    // Load ghost video when video path changes
    useEffect(() => {
        if (ghostVideoRef.current && videoPath) {
            ghostVideoRef.current.src = `file://${videoPath}`;
            ghostVideoRef.current.muted = true;
            ghostVideoRef.current.load();
        }
    }, [videoPath]);

    // Draw thumbnail when ghost video seeks
    useEffect(() => {
        const ghostVideo = ghostVideoRef.current;
        const canvas = canvasRef.current;

        if (!ghostVideo || !canvas) return;

        const handleSeeked = () => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Draw video frame to canvas
            ctx.drawImage(ghostVideo, 0, 0, canvas.width, canvas.height);
        };

        ghostVideo.addEventListener('seeked', handleSeeked);
        return () => ghostVideo.removeEventListener('seeked', handleSeeked);
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !duration) return;

        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const time = percentage * duration;

        setThumbnailPosition(x);
        setThumbnailTime(time);
        setShowThumbnail(true);

        // Seek ghost video if not already seeking and time difference is significant
        if (!isSeeking && ghostVideoRef.current && Math.abs(ghostVideoRef.current.currentTime - time) > 1) {
            setIsSeeking(true);
            // ghostVideoRef.current.currentTime = time;
            setTimeout(() => setIsSeeking(false), 100);
        }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        setShowThumbnail(false);
        e.currentTarget.style.height = '10px';
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.height = '15px';
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !duration) return;

        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const time = percentage * duration;

        onSeek(time);
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <Box style={{ position: 'relative', width: '100%' }}>
            {/* Hidden ghost video */}
            <video
                ref={ghostVideoRef}
                style={{ display: 'none' }}
            />

            {/* Thumbnail popup */}
            {showThumbnail && (
                <Box
                    style={{
                        position: 'absolute',
                        bottom: 25,
                        left: thumbnailPosition,
                        transform: 'translateX(-50%)',
                        width: 160,
                        backgroundColor: '#000',
                        border: '2px solid #fff',
                        borderRadius: 4,
                        overflow: 'hidden',
                        pointerEvents: 'none',
                        zIndex: 100,
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={160}
                        height={90}
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            backgroundColor: '#000'
                        }}
                    />
                    <Box
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: '#fff',
                            fontSize: 12,
                            textAlign: 'center',
                            padding: '2px 0'
                        }}
                    >
                        {formatTime(thumbnailTime)}
                    </Box>
                </Box>
            )}

            {/* Progress bar */}
            <Box
                ref={progressRef}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                style={{
                    height: 10,
                    backgroundColor: '#444',
                    borderRadius: 5,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'height 0.1s',
                }}
            >
                <Box
                    style={{
                        height: '100%',
                        width: `${progressPercentage}%`,
                        backgroundColor: '#ff0000',
                        borderRadius: 5,
                        pointerEvents: 'none',
                    }}
                />
            </Box>
        </Box>
    );
}
