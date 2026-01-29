// src/renderer/src/components/Screenshot/ScreenshotNavView.tsx

import { Box, ActionIcon } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useRef, useEffect } from 'react';
import { ScreenshotCard } from './ScreenshotCard';
import { Screenshot } from '../stores/screenshotStore';

interface AugmentedScreenshot extends Screenshot {
    isRemoved?: boolean;
}

interface NavViewProps {
    screenshots: AugmentedScreenshot[];
    activeFilename?: string;
    rotation: number;
    onScreenshotClick: (ts: number) => void;
    onSetCover: (s: Screenshot) => void;
    onDelete: (s: Screenshot) => void;
}

export function ScreenshotNavView({
    screenshots,
    activeFilename,
    rotation,
    onScreenshotClick,
    onSetCover,
    onDelete
}: NavViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // 核心：居中滚动逻辑
    useEffect(() => {
        if (!activeFilename || !scrollRef.current) return;

        const container = scrollRef.current;
        const safeId = activeFilename.replace(/\./g, '\\.');
        const activeElement = container.querySelector(`#screenshot-${safeId}`) as HTMLElement;

        if (activeElement) {
            const scrollLeft = activeElement.offsetLeft - container.offsetWidth / 2 + activeElement.offsetWidth / 2;
            container.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });
        }
    }, [activeFilename, screenshots.length]);

    const handlePage = (direction: 'prev' | 'next') => {
        if (!scrollRef.current) return;
        const containerWidth = scrollRef.current.offsetWidth;
        const scrollAmount = direction === 'next' ? containerWidth * 0.8 : -containerWidth * 0.8;
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };

    return (
        <Box style={{
            display: 'flex',
            alignItems: 'stretch', // 关键：当轨道被拉高时，让内容垂直居中
            gap: 4,
            width: '100%',
            height: '100%', // 关键：填充父容器动态高度
            backgroundColor: '#000',
            padding: '0 8px'
        }}>
            {/* 左翻页按钮 */}
            <ActionIcon
                variant="subtle"
                color="gray"
                size="xl"
                onClick={() => handlePage('prev')}
                disabled={screenshots.length === 0}
            >
                <IconChevronLeft size={30} />
            </ActionIcon>

            {/* 截图滚动区域 */}
            <Box
                ref={scrollRef}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center', // 确保图片在这一排里也是居中的
                    gap: 12,
                    overflowX: 'hidden',
                    padding: '10px 0',
                    scrollBehavior: 'smooth',
                    position: 'relative',
                    height: '100%'
                }}
            >
                {screenshots.map(s => (
                    <Box key={s.filename}
                        onClick={() => onScreenshotClick(s.timestamp)}
                        style={{ height: '100%', flexShrink: 0 }} // 确保外层包裹 Box 也是 100% 高度
                    >
                        <ScreenshotCard
                            screenshot={s}
                            mode="nav"
                            isActive={activeFilename === s.filename}
                            isCover={false}
                            isRemoved={s.isRemoved}
                            rotation={rotation}
                            onSetCover={onSetCover}
                            onDelete={onDelete}
                        />
                    </Box>
                ))}
            </Box>

            {/* 右翻页按钮 */}
            <ActionIcon
                variant="subtle"
                color="gray"
                size="xl"
                onClick={() => handlePage('next')}
                disabled={screenshots.length === 0}
            >
                <IconChevronRight size={30} />
            </ActionIcon>
        </Box>
    );
}