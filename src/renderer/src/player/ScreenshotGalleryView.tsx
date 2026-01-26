import { Box } from '@mantine/core';
import { useEffect, useRef, useMemo } from 'react';
import { ScreenshotCard } from './ScreenshotCard';
import { Screenshot } from '../stores/screenshotStore';

interface AugmentedScreenshot extends Screenshot {
    isRemoved?: boolean;
}

interface GalleryViewProps {
    screenshots: AugmentedScreenshot[];
    activeFilename?: string;
    rotation: number;
    onScreenshotClick: (ts: number) => void;
    onSetCover: (s: Screenshot) => void;
    onDelete: (s: Screenshot) => void;
}

export function ScreenshotGalleryView({
    screenshots,
    activeFilename,
    rotation,
    onScreenshotClick,
    onSetCover,
    onDelete
}: GalleryViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastCount = useRef(screenshots.length);

    // 1. 根据旋转角度判断是否为纵向布局
    const isRotatedVertical = (rotation / 90) % 2 !== 0;

    /**
     * 2. 动态计算 Grid 列宽 (核心布局逻辑)
     * - 预览模式高度固定为 320px
     * - 横向视频 (0/180°): 假设 16:9, 宽度约为 568px. minmax 设置为 400px 确保在大屏下能填满，小屏下自动折行
     * - 纵向视频 (90/270°): 假设 9:16, 宽度约为 180px. minmax 设置为 150px 显著增加排列密度
     */
    const gridMinWidth = useMemo(() => {
        return isRotatedVertical ? 160 : 400;
    }, [isRotatedVertical]);

    // 3. 自动滚动到底部 (追踪新截图)
    useEffect(() => {
        if (screenshots.length > lastCount.current) {
            containerRef.current?.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
        lastCount.current = screenshots.length;
    }, [screenshots.length]);

    return (
        <Box
            ref={containerRef}
            style={{
                height: 320,
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'grid',
                // 使用 auto-fill 和 1fr 实现无留白填充
                gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}px, 1fr))`,
                // 紧凑间距
                gap: '8px',
                padding: '8px',
                backgroundColor: '#000',

                // 滚动捕捉逻辑
                scrollSnapType: 'y mandatory',
                scrollBehavior: 'smooth',
                // 隐藏滚动条但保持功能 (可选，根据审美决定)
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }}
        >
            {screenshots.map(s => (
                <Box
                    key={s.filename}
                    onClick={() => onScreenshotClick(s.timestamp)}
                    style={{
                        // 每一行起始位置捕捉
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        height: 320,
                        width: '100%',
                        position: 'relative'
                    }}
                >
                    <ScreenshotCard
                        screenshot={s}
                        mode="preview"
                        isRemoved={s.isRemoved}
                        isActive={activeFilename === s.filename}
                        isCover={false} // 后续由 Store 逻辑判断
                        rotation={rotation}
                        onSetCover={onSetCover}
                        onDelete={onDelete}
                    />
                </Box>
            ))}
        </Box>
    );
}