// src/renderer/src/components/Screenshot/ScreenshotGalleryView.tsx

import { Box, Text } from '@mantine/core';
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

    // 1. 判断当前是否为旋转后的纵向状态
    const isRotatedVertical = (rotation / 90) % 2 !== 0;

    /**
     * 2. 动态计算 Grid 列宽 (核心参考 VideoGrid)
     * - 横向模式: 最小宽度 250px (对齐 VideoGrid)，单行显示较少但画面大
     * - 纵向模式: 最小宽度 140px，利用纵向优势，在相同宽度下展示更多内容
     */
    const gridMinWidth = useMemo(() => {
        return isRotatedVertical ? 140 : 250;
    }, [isRotatedVertical]);

    // 3. 自动滚动到底部 (追踪新截图)
    useEffect(() => {
        if (screenshots.length > lastCount.current) {
            // 给微弱延迟确保 DOM 已渲染
            setTimeout(() => {
                containerRef.current?.scrollTo({
                    top: containerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }, 50);
        }
        lastCount.current = screenshots.length;
    }, [screenshots.length]);

    if (screenshots.length === 0) {
        return (
            <Box style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1A1B1E',
                borderRadius: 8,
                margin: 20,
                border: '1px dashed #373A40'
            }}>
                <Text c="dimmed">暂无截图，点击下方“截图”按钮开始记录</Text>
            </Box>
        );
    }

    return (
        <Box
            ref={containerRef}
            style={{
                // 作为一个局部板块，设定合适的最大高度并允许内部滚动
                maxHeight: 'calc(100vh - 600px)',
                minHeight: 300,
                overflowY: 'auto',
                overflowX: 'hidden',

                // 参考 VideoGrid 的布局参数
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}px, 1fr))`,
                gap: 16,
                padding: 20,

                backgroundColor: '#101113', // 深色背景衬托截图
                scrollBehavior: 'smooth',

                // 优化滚动条样式 (Mantine 风格)
                scrollbarWidth: 'thin',
                scrollbarColor: '#444 transparent',
            }}
        >
            {screenshots.map(s => (
                <Box
                    key={s.filename}
                    onClick={() => onScreenshotClick(s.timestamp)}
                    style={{
                        width: '100%',
                        position: 'relative'
                    }}
                >
                    <ScreenshotCard
                        screenshot={s}
                        mode="preview"
                        isRemoved={s.isRemoved}
                        isActive={activeFilename === s.filename}
                        isCover={false}
                        rotation={rotation}
                        onSetCover={onSetCover}
                        onDelete={onDelete}
                    />
                </Box>
            ))}
        </Box>
    );
}