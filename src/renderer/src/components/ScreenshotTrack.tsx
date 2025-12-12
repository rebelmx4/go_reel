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

    // 【需求2】拖拽滚动所需的状态
    const dragInfo = useRef({
        isDragging: false,
        startX: 0,
        scrollLeftStart: 0,
    });

    const [isUserInteracting, setIsUserInteracting] = useState(false);
    const [coverFilename, setCoverFilename] = useState<string | null>(null);

    // activeScreenshot 和 fetchCoverStatus 逻辑保持不变...
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

    // 自动滚动逻辑保持不变...
    useEffect(() => {
        if (isUserInteracting || dragInfo.current.isDragging || !trackRef.current || !activeScreenshot) return;
        const activeElement = document.getElementById(`screenshot-${activeScreenshot.filename}`);
        if (activeElement) {
            const container = trackRef.current;
            const scrollLeft = activeElement.offsetLeft - container.offsetWidth / 2 + activeElement.offsetWidth / 2;
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }, [activeScreenshot, isUserInteracting]);

    // 【需求2】实现拖拽滚动的事件处理器
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!trackRef.current) return;
        // 阻止默认的文本选择等行为
        e.preventDefault();
        dragInfo.current = {
            isDragging: true,
            startX: e.pageX - trackRef.current.offsetLeft,
            scrollLeftStart: trackRef.current.scrollLeft,
        };
        trackRef.current.style.cursor = 'grabbing';
        // 标记用户正在交互，暂停自动滚动
        setIsUserInteracting(true);
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragInfo.current.isDragging || !trackRef.current) return;
        e.preventDefault();
        const x = e.pageX - trackRef.current.offsetLeft;
        const walk = (x - dragInfo.current.startX) * 1.5; // *1.5 加快滚动速度
        trackRef.current.scrollLeft = dragInfo.current.scrollLeftStart - walk;
    };

    const handleMouseUpOrLeave = () => {
        if (!dragInfo.current.isDragging) return;
        dragInfo.current.isDragging = false;
        if (trackRef.current) trackRef.current.style.cursor = 'grab';
        // 启动3秒计时器，之后恢复自动滚动
        interactionTimeoutRef.current = window.setTimeout(() => setIsUserInteracting(false), 3000);
    };

    // 点击卡片，立即恢复自动滚动
    const handleCardClick = (timestamp: number) => {
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
        setIsUserInteracting(false);
        onScreenshotClick(timestamp);
    };

    // 【需求3】为悬停按钮提供回调逻辑
    const handleSetCover = async (screenshot: Screenshot) => { /* ...逻辑不变，只是现在由 ScreenshotCard 调用... */ };
    const handleDelete = async (screenshot: Screenshot) => { /* ...逻辑不变，只是现在由 ScreenshotCard 调用... */ };

    return (
        <>
            <Box
                ref={trackRef}
                // 【需求2】绑定拖拽事件
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                style={{
                    // 【需求5】增加轨道整体高度
                    height: 120,
                    backgroundColor: '#1a1a1a',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px',
                    border: '1px solid #333',
                    overflowX: 'auto',
                    userSelect: 'none',
                    cursor: 'grab', // 初始光标样式
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
                                onClick={handleCardClick}
                                // 【需求3】传递新的回调函数
                                onSetCover={handleSetCover}
                                onDelete={handleDelete}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            {/* 【需求3 & 4】全局样式，用于悬停效果和美化滚动条 */}
            <style>{`
        .screenshot-card-container:hover .screenshot-card-overlay {
          opacity: 1;
        }

        /* Webkit 浏览器 (Chrome, Safari, Edge, Electron) */
        ::-webkit-scrollbar {
          height: 5px; /* 【需求4】滚动条高度 */
        }
        ::-webkit-scrollbar-track {
          background: #2c2e33; /* 轨道颜色 */
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: #5c5f66; /* 滑块颜色 */
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #868e96; /* 悬停时滑块颜色 */
        }
      `}</style>
        </>
    );
}