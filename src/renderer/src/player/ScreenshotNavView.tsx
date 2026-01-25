import { Box, ActionIcon } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useRef, useEffect } from 'react';
import { ScreenshotCard } from './ScreenshotCard';
import { Screenshot } from '../stores/screenshotStore';

interface NavViewProps {
    screenshots: Screenshot[];
    activeFilename?: string;
    rotation: number;
    onScreenshotClick: (ts: number) => void;
    onSetCover: (s: Screenshot) => void;
    onDelete: (s: Screenshot) => void;
}

export function ScreenshotNavView({ screenshots, activeFilename, rotation, onScreenshotClick, onSetCover, onDelete }: NavViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // 核心：居中滚动逻辑
    useEffect(() => {
        if (!activeFilename || !scrollRef.current) return;

        const container = scrollRef.current;
        // 注意：处理文件名中的点，防止 querySelector 报错
        const safeId = activeFilename.replace(/\./g, '\\.');
        const activeElement = container.querySelector(`#screenshot-${safeId}`) as HTMLElement;

        if (activeElement) {
            // 计算公式：卡片左偏移 - 容器一半宽度 + 卡片一半宽度 = 居中
            const scrollLeft = activeElement.offsetLeft - container.offsetWidth / 2 + activeElement.offsetWidth / 2;
            container.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });
        }
    }, [activeFilename]); // 当激活的截图变化时触发

    const handlePage = (direction: 'prev' | 'next') => {
        if (!scrollRef.current) return;
        const containerWidth = scrollRef.current.offsetWidth;
        const scrollAmount = direction === 'next' ? containerWidth * 0.8 : -containerWidth * 0.8;
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };

    return (
        <Box style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', height: 130 }}>
            <ActionIcon variant="subtle" color="gray" onClick={() => handlePage('prev')} disabled={screenshots.length === 0}>
                <IconChevronLeft size={30} />
            </ActionIcon>

            <Box
                ref={scrollRef}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    overflowX: 'hidden',
                    padding: '5px 0',
                    scrollBehavior: 'smooth',
                    position: 'relative'
                }}
            >
                {screenshots.map(s => (
                    <Box key={s.filename} onClick={() => onScreenshotClick(s.timestamp)}>
                        <ScreenshotCard
                            screenshot={s}
                            mode="nav"
                            isActive={activeFilename === s.filename}
                            isCover={false}
                            rotation={rotation}
                            onSetCover={onSetCover}
                            onDelete={onDelete}
                        />
                    </Box>
                ))}
            </Box>

            <ActionIcon variant="subtle" color="gray" onClick={() => handlePage('next')} disabled={screenshots.length === 0}>
                <IconChevronRight size={30} />
            </ActionIcon>
        </Box>
    );
}