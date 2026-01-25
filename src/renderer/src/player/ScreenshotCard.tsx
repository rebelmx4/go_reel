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
    mode: 'nav' | 'preview';
    onSetCover: (screenshot: Screenshot) => void;
    onDelete: (screenshot: Screenshot) => void;
}

export function ScreenshotCard({
    screenshot,
    isActive,
    isCover,
    rotation,
    mode,
    onSetCover,
    onDelete,
}: ScreenshotCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

    // 平滑旋转逻辑
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

    // 1. 确定容器高度
    const containerHeight = mode === 'preview' ? 320 : (isRotatedVertical ? 120 : 100);

    // 2. 动态计算容器宽度 (关键：旋转后比例要取反)
    const containerWidth = useMemo(() => {
        const currentRatio = isRotatedVertical ? (1 / aspectRatio) : aspectRatio;
        return containerHeight * currentRatio;
    }, [containerHeight, aspectRatio, isRotatedVertical]);

    return (
        <Box
            id={`screenshot-${screenshot.filename}`}
            className="screenshot-card-container"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'relative',
                flexShrink: 0,
                height: `${containerHeight}px`,
                // 预览模式下，由外部 Grid 决定宽度，但我们要提供一个基础宽度
                width: mode === 'preview' ? '100%' : `${containerWidth}px`,
                maxWidth: mode === 'preview' ? 'none' : `${containerWidth}px`,
                backgroundColor: '#000',
                borderRadius: mode === 'nav' ? 4 : 8,
                overflow: 'hidden',
                cursor: 'pointer',
                border: `2px solid ${isActive ? '#228be6' : 'transparent'}`,
                transition: 'all 0.3s ease',
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
                    // 核心：旋转时，图片的高度必须撑满容器的宽或高
                    width: isRotatedVertical ? `${containerHeight}px` : `100%`,
                    height: isRotatedVertical ? `100%` : `100%`,
                    // 旋转后，原本的宽变成了高，原本的高变成了宽
                    // 必须让图片在旋转后的视觉尺寸填满容器
                    objectFit: 'cover',
                    transform: `translate(-50%, -50%) rotate(${visualRotation}deg) scale(${isRotatedVertical ? (containerWidth / containerHeight) * (aspectRatio) : 1})`,
                    // 上面的 scale 是为了处理旋转后的比例补偿，更简单的办法是：
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: isHovered ? 'brightness(0.7)' : 'none',
                    // 如果 scale 复杂，我们换个思路：直接根据旋转状态交换宽高
                    ...(isRotatedVertical ? {
                        width: `${containerHeight}px`,
                        height: `${containerWidth}px`,
                    } : {
                        width: '100%',
                        height: '100%',
                    })
                }}
            />

            <Box style={{
                position: 'absolute', bottom: 0, left: 0, width: '100%',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                color: 'white', padding: '4px 8px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                zIndex: 2, pointerEvents: 'none',
                opacity: (mode === 'preview' || isHovered) ? 1 : 0,
            }}>
                <span style={{ fontSize: mode === 'nav' ? '10px' : '12px', fontWeight: 600 }}>
                    {formatDuration(screenshot.timestamp, 'ms')}
                </span>
                <Box style={{ display: 'flex', gap: '4px', pointerEvents: 'auto' }}>
                    <ActionIcon variant="filled" size="xs" color={isCover ? "green" : "blue"} onClick={(e) => { e.stopPropagation(); onSetCover(screenshot); }}>
                        {isCover ? <IconCheck size={12} /> : <IconPhoto size={12} />}
                    </ActionIcon>
                    <ActionIcon variant="filled" size="xs" color="red" onClick={(e) => { e.stopPropagation(); onDelete(screenshot); }}>
                        <IconTrash size={12} />
                    </ActionIcon>
                </Box>
            </Box>
        </Box>
    );
}