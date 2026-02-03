// src/renderer/src/components/Screenshot/LazyScreenshotCard.tsx
import { Box } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import { useState, useEffect } from 'react';
import { ScreenshotCard } from './ScreenshotCard';
import { Screenshot } from '../stores/screenshotStore';

interface LazyScreenshotCardProps {
    screenshot: Screenshot;
    isActive: boolean;
    isCover: boolean;
    rotation: number;
    isRemoved?: boolean;
    // 需要传入视频原始比例来撑开占位符
    videoAspectRatio: number;
    onScreenshotClick: (ts: number) => void;
    onSetCover: (s: Screenshot) => void;
    onDelete: (s: Screenshot) => void;
}

export function LazyScreenshotCard({
    screenshot,
    videoAspectRatio,
    rotation,
    ...props
}: LazyScreenshotCardProps) {
    const [hasBeenSeen, setHasBeenSeen] = useState(false);
    const { ref, entry } = useIntersection({
        rootMargin: '300px', // 提前 300px 开始加载
        threshold: 0.1,
    });

    // 一旦进入视野，记录为已加载，之后不再重置
    useEffect(() => {
        if (entry?.isIntersecting) {
            setHasBeenSeen(true);
        }
    }, [entry?.isIntersecting]);

    // 计算占位符比例（逻辑同 Card 内部）
    const isRotatedVertical = (rotation / 90) % 2 !== 0;
    const placeholderRatio = isRotatedVertical ? 1 / videoAspectRatio : videoAspectRatio;

    return (
        <Box
            ref={ref}
            style={{
                height: '100%',
                aspectRatio: `${placeholderRatio}`,
                flexShrink: 0
            }}
        >
            {hasBeenSeen ? (
                <ScreenshotCard
                    screenshot={screenshot}
                    rotation={rotation}
                    {...props}
                />
            ) : (
                // 占位符：保持和卡片一样的外框对比感，但不加载图片
                <Box style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 4,
                    backgroundColor: '#1A1B1E',
                    border: '2px solid #2C2E33'
                }} />
            )}
        </Box>
    );
}