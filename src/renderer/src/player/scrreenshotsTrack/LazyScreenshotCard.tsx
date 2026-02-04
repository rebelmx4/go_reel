// src/renderer/src/components/Screenshot/LazyScreenshotCard.tsx
import { Box } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import { useState, useEffect } from 'react';
import { ScreenshotCard, ScreenshotCardProps } from './ScreenshotCard';
import { useVideoContext } from '../contexts/VideoContext';


export function LazyScreenshotCard({
    screenshot,
    rotation,
    ...props
}: ScreenshotCardProps) {
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
    const { metadata } = useVideoContext(); // 直接取
    const isRotatedVertical = (rotation / 90) % 2 !== 0;
    const placeholderRatio = isRotatedVertical ? (1 / metadata.aspectRatio) : metadata.aspectRatio;

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