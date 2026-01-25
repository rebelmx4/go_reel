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

    // 平滑旋转
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

    // 计算容器高度
    const containerHeight = useMemo(() => {
        if (mode === 'preview') return 320;
        return isRotatedVertical ? 120 : 100;
    }, [mode, isRotatedVertical]);

    // 计算容器宽度
    const containerWidth = useMemo(() => {
        if (mode === 'preview') return '100%'; // 预览模式交由 Grid 控制
        // 导航模式下，根据比例算出宽度，旋转后比例翻转
        return isRotatedVertical ? containerHeight / aspectRatio : containerHeight * aspectRatio;
    }, [containerHeight, aspectRatio, isRotatedVertical, mode]);

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
                width: typeof containerWidth === 'number' ? `${containerWidth}px` : containerWidth,
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
                    // 关键修复：旋转时图片的长宽映射
                    // 如果旋转了，图片的宽度应该对应容器的高度，高度对应容器的宽度
                    width: isRotatedVertical ? `${containerHeight}px` : '100%',
                    height: isRotatedVertical ? 'auto' : '100%',
                    maxHeight: isRotatedVertical ? '100vw' : '100%',
                    // 使用 contain 确保旋转后长边不会被切掉
                    objectFit: 'contain',
                    transform: `translate(-50%, -50%) rotate(${visualRotation}deg)`,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: isHovered ? 'brightness(0.7)' : 'none',
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