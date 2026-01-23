import { Box, ActionIcon } from '@mantine/core';
import { IconPhoto, IconTrash, IconCheck } from '@tabler/icons-react';
import { Screenshot } from '../stores/screenshotStore';
import { useState, useMemo, useEffect, useRef } from 'react';
import { formatDuration } from '../utils/format';

interface ScreenshotCardProps {
    screenshot: Screenshot;
    isActive: boolean;
    isCover: boolean;
    rotation: number;
    onSetCover: (screenshot: Screenshot) => void;
    onDelete: (screenshot: Screenshot) => void;
}

const formatMSTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    return hours > 0
        ? `${String(hours).padStart(2, '0')}:${paddedMinutes}:${paddedSeconds}`
        : `${paddedMinutes}:${paddedSeconds}`;
};

export function ScreenshotCard({
    screenshot,
    isActive,
    isCover,
    rotation,
    onSetCover,
    onDelete,
}: ScreenshotCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

    // --- 平滑旋转核心逻辑 ---
    const [visualRotation, setVisualRotation] = useState(rotation);
    const prevRotationRef = useRef(rotation);

    useEffect(() => {
        const prev = prevRotationRef.current;
        let delta = rotation - prev;
        if (delta === -270) delta = 90;       // 处理 270 -> 0 顺时针
        else if (delta === 270) delta = -90;  // 处理 0 -> 270 逆时针

        setVisualRotation(v => v + delta);
        prevRotationRef.current = rotation;
    }, [rotation]);

    const isRotatedVertical = (rotation / 90) % 2 !== 0;
    const cardHeight = 320;

    // 计算容器宽度
    const cardWidth = useMemo(() => {
        return isRotatedVertical ? cardHeight / aspectRatio : cardHeight * aspectRatio;
    }, [aspectRatio, isRotatedVertical]);

    return (
        <Box
            id={`screenshot-${screenshot.filename}`}
            className="screenshot-card-container"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'relative',
                flexShrink: 0,
                height: `${cardHeight}px`,
                width: `${cardWidth}px`,
                backgroundColor: '#000',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                border: `3px solid ${isActive ? '#228be6' : 'transparent'}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isHovered ? 'translateY(-4px)' : 'none',
                boxShadow: isHovered ? '0 10px 15px -3px rgba(0,0,0,0.4)' : 'none',
            }}
        >
            <img
                src={screenshot.path}
                alt="Screenshot"
                onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalHeight > 0) setAspectRatio(img.naturalWidth / img.naturalHeight);
                }}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    // 关键：旋转时需要交换宽高
                    width: isRotatedVertical ? `${cardHeight}px` : '100%',
                    height: isRotatedVertical ? `${cardWidth}px` : '100%',
                    objectFit: 'cover',
                    transform: `translate(-50%, -50%) rotate(${visualRotation}deg)`,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: isHovered ? 'brightness(0.7)' : 'none',
                }}
            />

            {/* 底部信息栏 - 只有 Hover 时显示按钮 */}
            <Box style={{
                position: 'absolute', bottom: 0, left: 0, width: '100%',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                color: 'white', padding: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                zIndex: 2, pointerEvents: 'none'
            }}>
                <span style={{ fontSize: '12px', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    {formatDuration(screenshot.timestamp, 'ms')}
                </span>

                <Box style={{
                    display: 'flex', gap: '4px', pointerEvents: 'auto',
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'translateX(0)' : 'translateX(10px)',
                    transition: 'all 0.2s ease'
                }}>
                    <ActionIcon
                        variant="filled" size="sm"
                        color={isCover ? "green" : "blue"}
                        onClick={(e) => { e.stopPropagation(); onSetCover(screenshot); }}
                    >
                        {isCover ? <IconCheck size={14} /> : <IconPhoto size={14} />}
                    </ActionIcon>
                    <ActionIcon
                        variant="filled" size="sm" color="red"
                        onClick={(e) => { e.stopPropagation(); onDelete(screenshot); }}
                    >
                        <IconTrash size={14} />
                    </ActionIcon>
                </Box>
            </Box>
        </Box>
    );
}