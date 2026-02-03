import { Box, ActionIcon } from '@mantine/core';
import { IconPhoto, IconTrash } from '@tabler/icons-react';
import { Screenshot } from '../stores/screenshotStore';
import { useState, useEffect, useRef } from 'react';
import { formatDuration } from '../utils/format';

interface ScreenshotCardProps {
    screenshot: Screenshot;
    isActive: boolean;
    isCover: boolean;
    rotation: number;
    isRemoved?: boolean;
    onSetCover: (screenshot: Screenshot) => void;
    onDelete: (screenshot: Screenshot) => void;
}

export function ScreenshotCard({
    screenshot,
    isActive,
    isCover,
    rotation,
    isRemoved,
    onSetCover,
    onDelete,
}: ScreenshotCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<number | string>('16/9');

    // 处理图片加载获取原始比例
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        setAspectRatio(naturalWidth / naturalHeight);
    };

    const [visualRotation, setVisualRotation] = useState(rotation);
    const prevRotationRef = useRef(rotation);

    useEffect(() => {
        const prev = prevRotationRef.current;
        let delta = rotation - prev;
        if (delta === -270) delta = 90;
        else if (delta === 270) delta = -90;
        setVisualRotation(v => v + delta);
        prevRotationRef.current = rotation;
    }, [rotation]);

    const isRotatedVertical = (rotation / 90) % 2 !== 0;

    const finalAspectRatio = isRotatedVertical
        ? (typeof aspectRatio === 'number' ? 1 / aspectRatio : '9/16')
        : aspectRatio;

    const safeId = screenshot.filename.replace(/[^a-zA-Z0-9]/g, '_');

    return (
        <Box
            id={`screenshot-${safeId}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'relative',
                borderRadius: 4,
                overflow: 'hidden',
                cursor: 'pointer',
                backgroundColor: '#1A1B1E',
                height: '100%',
                aspectRatio: finalAspectRatio,
                width: 'auto',
                border: isActive
                    ? '2px solid #FF0000'
                    : isHovered
                        ? '2px solid #A0A0A0'  // 悬停时接近浅灰
                        : '2px solid #454545', // 默认从 #2C 提升到 #45，对比更强

                padding: 1,
                filter: isRemoved ? 'grayscale(100%) opacity(0.5)' : 'none',
                transition: 'border 0.2s, box-shadow 0.2s, filter 0.3s',
                boxSizing: 'border-box',
                boxShadow: '0 4px 6px rgba(0,0,0,0.4)'
            }}
        >
            {isActive && (
                <Box style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(34, 139, 230, 0.1)',
                    pointerEvents: 'none',
                    zIndex: 2
                }} />
            )}

            {/* 图片主体 */}
            <img
                src={screenshot.path}
                onLoad={handleImageLoad}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    objectFit: 'contain',
                    width: isRotatedVertical ? `calc(100% / ${finalAspectRatio})` : '100%',
                    height: isRotatedVertical ? `calc(100% * ${finalAspectRatio})` : '100%',
                    transform: `translate(-50%, -50%) rotate(${visualRotation}deg)`,
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s',
                    filter: isHovered ? 'brightness(0.7)' : 'none',
                }}
            />

            <Box style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 4,
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.2s ease',
                background: 'linear-gradient(rgba(0,0,0,0.4) 0%, transparent 40%, rgba(0,0,0,0.6) 100%)',
                pointerEvents: isHovered ? 'auto' : 'none'
            }}>
                <Box style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <ActionIcon size="sm" variant="filled" color="red" onClick={(e) => { e.stopPropagation(); onDelete(screenshot); }}>
                        <IconTrash size={22} />
                    </ActionIcon>
                </Box>

                <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: 'white', fontWeight: 'bold', textShadow: '0 1px 2px #000' }}>
                        {formatDuration(screenshot.timestamp, 'ms')}
                    </span>
                    <ActionIcon size="sm" variant={isCover ? "filled" : "light"} color="blue" onClick={(e) => { e.stopPropagation(); onSetCover(screenshot); }}>
                        <IconPhoto size={22} />
                    </ActionIcon>
                </Box>
            </Box>
        </Box>
    );
}