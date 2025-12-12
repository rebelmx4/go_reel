import { Box, Text } from '@mantine/core';
import { usePlayerStore, useScreenshotStore, useToastStore } from '../stores';
import { ScreenshotCard } from './ScreenshotCard';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Screenshot } from '../stores/screenshotStore';

interface ScreenshotTrackProps {
    onScreenshotClick: (timestamp: number) => void;
}

export function ScreenshotTrack({ onScreenshotClick }: ScreenshotTrackProps) {
    const screenshots = useScreenshotStore((state) => state.screenshots);
    const setScreenshots = useScreenshotStore((state) => state.setScreenshots);
    const currentVideoPath = usePlayerStore((state) => state.currentVideoPath);
    const currentTime = usePlayerStore((state) => state.currentTime);
    const rotation = usePlayerStore((state) => state.rotation);
    const showToast = useToastStore((state) => state.showToast);

    const trackRef = useRef<HTMLDivElement>(null);
    const interactionTimeoutRef = useRef<number | null>(null);

    // 【修改1】优化拖拽状态，增加 moved 标志位以区分点击和拖拽
    const dragInfo = useRef({
        isDragging: false,
        startX: 0,
        scrollLeftStart: 0,
        moved: false, // 新增标志位
    });

    const [isUserInteracting, setIsUserInteracting] = useState(false);
    const [coverFilename, setCoverFilename] = useState<string | null>(null);

    const activeScreenshot = useMemo(() => {
        if (screenshots.length === 0) return null;
        return screenshots.reduce((closest, s) => {
            const currentDiff = Math.abs(s.timestamp / 1000 - currentTime);
            const closestDiff = Math.abs(closest.timestamp / 1000 - currentTime);
            return currentDiff < closestDiff ? s : closest;
        });
    }, [currentTime, screenshots]);

    useEffect(() => {
        const fetchCoverStatus = async () => { /* ...此部分不变... */ };
        fetchCoverStatus();
    }, [currentVideoPath, screenshots]);

    useEffect(() => {
        if (isUserInteracting || dragInfo.current.isDragging || !trackRef.current || !activeScreenshot) return;
        const activeElement = document.getElementById(`screenshot-${activeScreenshot.filename}`);
        if (activeElement) {
            const container = trackRef.current;
            const scrollLeft = activeElement.offsetLeft - container.offsetWidth / 2 + activeElement.offsetWidth / 2;
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }, [activeScreenshot, isUserInteracting]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!trackRef.current) return;
        dragInfo.current = {
            isDragging: true,
            startX: e.pageX - trackRef.current.offsetLeft,
            scrollLeftStart: trackRef.current.scrollLeft,
            moved: false,
        };
        trackRef.current.style.cursor = 'grabbing';
        setIsUserInteracting(true);
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragInfo.current.isDragging || !trackRef.current) return;
        const x = e.pageX - trackRef.current.offsetLeft;
        const walk = x - dragInfo.current.startX;
        if (Math.abs(walk) > 5) {
            dragInfo.current.moved = true;
            e.preventDefault();
            trackRef.current.scrollLeft = dragInfo.current.scrollLeftStart - walk * 1.5;
        }
    };

    // 【修改2】重构 handleMouseUpOrLeave 以处理点击
    const handleMouseUpOrLeave = (e: React.MouseEvent) => {
        if (!dragInfo.current.isDragging) return;

        // 如果鼠标没有移动，则判定为点击
        if (!dragInfo.current.moved) {
            // 查找被点击的卡片元素
            let target = e.target as HTMLElement;
            const cardElement = target.closest('.screenshot-card-container');

            // 确保点击的不是按钮
            const buttonElement = target.closest('button');

            if (cardElement && !buttonElement) {
                const filename = cardElement.id.replace('screenshot-', '');
                const clickedScreenshot = screenshots.find(s => s.filename === filename);
                if (clickedScreenshot) {
                    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
                    setIsUserInteracting(false);
                    onScreenshotClick(clickedScreenshot.timestamp);
                }
            }
        }

        // 重置拖拽状态
        dragInfo.current.isDragging = false;
        if (trackRef.current) trackRef.current.style.cursor = 'grab';
        interactionTimeoutRef.current = window.setTimeout(() => setIsUserInteracting(false), 3000);
    };

    const handleSetCover = async (screenshot: Screenshot) => { /* ...逻辑不变... */ };
    const handleDelete = async (screenshot: Screenshot) => { /* ...逻辑不变... */ };

    return (
        <>
            <Box
                ref={trackRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                style={{
                    height: 120,
                    backgroundColor: '#1a1a1a',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px',
                    border: '1px solid #333',
                    overflowX: 'auto',
                    userSelect: 'none',
                    cursor: 'grab',
                }}
            >
                {screenshots.length === 0 ? (
                    <Text size="sm" c="dimmed" style={{ margin: '0 auto' }}>正在生成预览...</Text>
                ) : (
                    <Box style={{ display: 'flex', gap: 10, height: '100%' }}>
                        {screenshots.map((s) => (
                            <ScreenshotCard
                                key={s.filename}
                                screenshot={s}
                                isActive={activeScreenshot?.filename === s.filename}
                                isCover={coverFilename === s.filename}
                                rotation={rotation}
                                onSetCover={handleSetCover}
                                onDelete={handleDelete}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            {/* 【修改4】补全并优化全局样式 */}
            <style>{`
        .screenshot-card-container:hover .screenshot-card-overlay {
          opacity: 1;
        }

        /* 补全的样式：悬停时模糊和变暗图片，让按钮更突出 */
        .screenshot-card-container:hover .screenshot-card-image {
          filter: blur(4px) brightness(0.7);
        }

        /* Webkit 浏览器 (Chrome, Safari, Edge, Electron) */
        ::-webkit-scrollbar {
          height: 5px;
        }
        ::-webkit-scrollbar-track {
          background: #2c2e33;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: #5c5f66;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #868e96;
        }
      `}</style>
        </>
    );
}