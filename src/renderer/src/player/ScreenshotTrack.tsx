// src/components/player/ScreenshotTrack.tsx

import { Box, Text, Loader, Center, Group } from '@mantine/core';
import { usePlayerStore, useScreenshotStore, useToastStore, usePlaylistStore } from '../stores';
import { ScreenshotCard } from './ScreenshotCard';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Screenshot } from '../stores/screenshotStore';

interface ScreenshotTrackProps {
    /** 点击截图卡片时的回调，通常用于跳转播放器进度 */
    onScreenshotClick: (timestampInMs: number) => void;
}

export function ScreenshotTrack({ onScreenshotClick }: ScreenshotTrackProps) {
    // 1. 从 Store 获取状态
    const {
        screenshots,
        isLoading,
        loadScreenshots,
        deleteScreenshot,
        setAsCover
    } = useScreenshotStore();

    const currentVideoPath = usePlaylistStore((state) => state.currentPath);
    const currentTime = usePlayerStore((state) => state.currentTime);
    const rotation = usePlayerStore((state) => state.rotation);
    const showToast = useToastStore((state) => state.showToast);

    // 2. 引用与状态
    const trackRef = useRef<HTMLDivElement>(null);
    const interactionTimeoutRef = useRef<number | null>(null);
    const [isUserInteracting, setIsUserInteracting] = useState(false);

    // 拖拽逻辑状态
    const dragInfo = useRef({
        isDragging: false,
        startX: 0,
        scrollLeftStart: 0,
        moved: false,
    });

    // 3. 自动加载逻辑：路径变了就去加载
    useEffect(() => {
        if (currentVideoPath) {
            loadScreenshots(currentVideoPath);
        }
    }, [currentVideoPath, loadScreenshots]);

    // 4. 计算当前播放进度对应的“最接近截图”
    const activeScreenshot = useMemo(() => {
        if (screenshots.length === 0) return null;
        // 将当前秒数转为毫秒进行比对
        const currentMs = currentTime * 1000;
        return screenshots.reduce((closest, s) => {
            const currentDiff = Math.abs(s.timestamp - currentMs);
            const closestDiff = Math.abs(closest.timestamp - currentMs);
            return currentDiff < closestDiff ? s : closest;
        });
    }, [currentTime, screenshots]);

    // 5. 自动滚动逻辑：跟随播放进度滚动到 Active 截图位置
    useEffect(() => {
        // 如果用户正在操作轨道，或者正在拖拽，或者容器没准备好，则不执行自动滚动
        if (isUserInteracting || dragInfo.current.isDragging || !trackRef.current || !activeScreenshot) return;

        const activeElement = document.getElementById(`screenshot-${activeScreenshot.filename}`);
        if (activeElement) {
            const container = trackRef.current;
            // 计算居中位置
            const scrollLeft = activeElement.offsetLeft - container.offsetWidth / 2 + activeElement.offsetWidth / 2;
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }, [activeScreenshot, isUserInteracting]);

    // 6. 交互处理：鼠标按下 (开始拖拽)
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
        if (interactionTimeoutRef.current) window.clearTimeout(interactionTimeoutRef.current);
    };

    // 7. 交互处理：鼠标移动
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragInfo.current.isDragging || !trackRef.current) return;
        const x = e.pageX - trackRef.current.offsetLeft;
        const walk = (x - dragInfo.current.startX) * 1.5; // 1.5倍滚动速度

        if (Math.abs(walk) > 5) {
            dragInfo.current.moved = true;
            e.preventDefault();
            trackRef.current.scrollLeft = dragInfo.current.scrollLeftStart - walk;
        }
    };

    // 8. 交互处理：鼠标松开或离开 (判定点击 vs 拖拽结束)
    const handleMouseUpOrLeave = (e: React.MouseEvent) => {
        if (!dragInfo.current.isDragging) return;

        // 如果没有移动，判定为点击
        if (!dragInfo.current.moved) {
            const target = e.target as HTMLElement;
            // 找到包裹容器
            const cardElement = target.closest('.screenshot-card-container');
            // 排除点击到卡片上的按钮（删除/封面按钮）
            const isButtonClick = target.closest('button');

            if (cardElement && !isButtonClick) {
                // 提取 ID 获取对应的截图对象
                const filename = cardElement.id.replace('screenshot-', '');
                const clicked = screenshots.find(s => s.filename === filename);
                if (clicked) {
                    onScreenshotClick(clicked.timestamp);
                }
            }
        }

        // 重置状态
        dragInfo.current.isDragging = false;
        if (trackRef.current) trackRef.current.style.cursor = 'grab';

        // 3秒后恢复自动滚动跟随
        interactionTimeoutRef.current = window.setTimeout(() => {
            setIsUserInteracting(false);
        }, 3000);
    };

    // 9. 业务操作处理
    const handleSetCover = async (screenshot: Screenshot) => {
        if (!currentVideoPath) return;
        // 去掉 file:// 前缀获取原始物理路径
        const sourcePath = screenshot.path.replace('file://', '');
        const success = await setAsCover(currentVideoPath, sourcePath);
        if (success) showToast({ message: '已将该截图设为封面', type: 'success' });
    };

    const handleDelete = async (screenshot: Screenshot) => {
        if (!currentVideoPath) return;
        await deleteScreenshot(currentVideoPath, screenshot.filename);
        showToast({ message: '截图已删除', type: 'info' });
    };

    return (
        <Box style={{ position: 'relative' }}>
            <Box
                ref={trackRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                // 使用 className 配合下方的 style 标签
                className="custom-screenshot-track"
                style={{
                    height: 380,
                    backgroundColor: 'rgba(20, 20, 20, 0.95)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    border: '1px solid #333',
                    overflowX: 'auto',
                    userSelect: 'none',
                    cursor: dragInfo.current.isDragging ? 'grabbing' : 'grab',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#444 transparent',
                }}
            >
                {/* 内容渲染逻辑保持不变 */}
                {isLoading && screenshots.length === 0 ? (
                    <Center style={{ width: '100%' }}><Loader size="sm" /></Center>
                ) : (
                    <Box style={{ display: 'flex', gap: 16, height: 320, padding: '10px 0' }}>
                        {screenshots.map((s) => (
                            <ScreenshotCard
                                key={s.filename}
                                screenshot={s}
                                isActive={activeScreenshot?.filename === s.filename}
                                isCover={false}
                                rotation={rotation}
                                onSetCover={() => handleSetCover(s)}
                                onDelete={() => handleDelete(s)}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            {/* 将 CSS 嵌入组件内部，解决 sx 报错且不增加外部文件 */}
            <style>{`
                .custom-screenshot-track::-webkit-scrollbar {
                    height: 6px;
                }
                .custom-screenshot-track::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-screenshot-track::-webkit-scrollbar-thumb {
                    background: #444;
                    border-radius: 10px;
                }
                .custom-screenshot-track::-webkit-scrollbar-thumb:hover {
                    background: #666;
                }
                /* 统一处理卡片悬停，不再散落在各处 */
                .screenshot-card-container {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .screenshot-card-container:hover {
                    transform: translateY(-5px);
                }
            `}</style>
        </Box>
    );
}