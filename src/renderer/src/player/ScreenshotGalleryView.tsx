import { Box } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { ScreenshotCard } from './ScreenshotCard';
import { Screenshot } from '../stores/screenshotStore';

interface GalleryViewProps {
    screenshots: Screenshot[];
    activeFilename?: string;
    rotation: number;
    onScreenshotClick: (ts: number) => void;
    onSetCover: (s: Screenshot) => void;
    onDelete: (s: Screenshot) => void;
}

export function ScreenshotGalleryView({ screenshots, activeFilename, rotation, onScreenshotClick, onSetCover, onDelete }: GalleryViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastCount = useRef(screenshots.length);

    useEffect(() => {
        if (screenshots.length > lastCount.current) {
            containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
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
                // 使用 300px 作为最小宽度，确保在一行内能更灵活地排布且填满
                gridTemplateColumns: `repeat(auto-fill, minmax(300px, 1fr))`,
                gap: '20px',
                padding: 0,
                scrollbarWidth: 'none',
                scrollSnapType: 'y mandatory',
                scrollBehavior: 'smooth',
            }}
        >
            {screenshots.map(s => (
                <Box
                    key={s.filename}
                    onClick={() => onScreenshotClick(s.timestamp)}
                    style={{
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        // 确保旋转后的卡片不会撑开额外的布局空白
                        minWidth: 0,
                        overflow: 'hidden'
                    }}
                >
                    <ScreenshotCard
                        screenshot={s}
                        mode="preview"
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