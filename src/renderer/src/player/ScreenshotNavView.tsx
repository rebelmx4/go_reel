// src/renderer/src/components/Screenshot/ScreenshotNavView.tsx
import { Box, ActionIcon } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useRef, useEffect, useState } from 'react';
import { ScreenshotCard } from './ScreenshotCard';
import { Screenshot } from '../stores/screenshotStore';

interface NavViewProps {
    screenshots: any[];
    activeFilename?: string;
    rotation: number;
    onScreenshotClick: (ts: number) => void;
    onSetCover: (s: Screenshot) => void;
    onDelete: (s: Screenshot) => void;
}

export function ScreenshotNavView({ screenshots, activeFilename, rotation, onScreenshotClick, onSetCover, onDelete }: NavViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const lockTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [scrollProgress, setScrollProgress] = useState(0);

    // 锁定逻辑：任何交互都会重置计时器
    const suppressAutoScroll = () => {
        // setAutoScrollEnabled(false);
        // if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
        // lockTimerRef.current = setTimeout(() => {
        //     setAutoScrollEnabled(true);
        // }, 10000); // 10秒后恢复自动跟随
    };

    // 监听截图数量变化（通常是刚截图），也需要触发锁定（让用户看清截到的图）
    useEffect(() => {
        if (screenshots.length > 0) suppressAutoScroll();
    }, [screenshots.length]);

    // 核心：自动居中
    useEffect(() => {
        if (!activeFilename || !scrollRef.current || !autoScrollEnabled) return;

        const container = scrollRef.current;
        const safeId = activeFilename.replace(/[^a-zA-Z0-9]/g, '_');
        const activeElement = container.querySelector(`#screenshot-${safeId}`) as HTMLElement;

        if (activeElement) {
            const scrollLeft = activeElement.offsetLeft - container.offsetWidth / 2 + activeElement.offsetWidth / 2;
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }, [activeFilename, autoScrollEnabled]);

    const handlePage = (direction: 'prev' | 'next') => {
        const container = scrollRef.current;
        if (!container) return;
        suppressAutoScroll();

        const children = Array.from(container.children) as HTMLElement[];
        const containerLeft = container.scrollLeft;
        const containerWidth = container.offsetWidth;

        let targetScroll = containerLeft;

        if (direction === 'next') {
            // 寻找第一个右侧被遮挡的卡片（哪怕只遮挡了1px）
            const firstObscuredRight = children.find(
                child => child.offsetLeft + child.offsetWidth > containerLeft + containerWidth + 5
            );
            if (firstObscuredRight) {
                targetScroll = firstObscuredRight.offsetLeft;
            } else {
                targetScroll = container.scrollWidth;
            }
        } else {
            // 寻找左侧第一个被遮挡的卡片
            const firstObscuredLeft = [...children].reverse().find(
                child => child.offsetLeft < containerLeft - 5
            );
            if (firstObscuredLeft) {
                // 让这个卡片成为新视野的最后一个，或者将其左侧对齐（通常回退一屏）
                targetScroll = Math.max(0, firstObscuredLeft.offsetLeft + firstObscuredLeft.offsetWidth - containerWidth);
                // 二次校准：确保对齐到某张图的开头
                const alignToChild = children.find(c => c.offsetLeft >= targetScroll - 5);
                if (alignToChild) targetScroll = alignToChild.offsetLeft;
            } else {
                targetScroll = 0;
            }
        }

        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    };

    // 滚轮支持：滚动一页
    const handleWheel = (e: React.WheelEvent) => {
        // 只有横向滚动或者纵向滚动量较大时触发
        if (Math.abs(e.deltaY) > 5) {
            handlePage(e.deltaY > 0 ? 'next' : 'prev');
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const progress = (el.scrollLeft / (el.scrollWidth - el.offsetWidth)) * 100;
        setScrollProgress(isNaN(progress) ? 0 : progress);
    };


    return (
        <Box
            onWheel={handleWheel}
            style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#000' }}
        >
            {/* 左翻页：贯穿式按钮 */}
            <Box
                className="nav-control-left"
                style={{
                    position: 'absolute', top: 0, left: 0, bottom: 0, width: 80,
                    zIndex: 10, pointerEvents: 'none',
                    background: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                    opacity: scrollProgress <= 1 ? 0 : 1, // 在最左侧时隐藏
                    transition: 'opacity 0.3s'
                }}
            >
                <ActionIcon
                    variant="subtle" color="gray" size="xl"
                    onClick={() => handlePage('prev')}
                    style={{ pointerEvents: 'auto', opacity: 0.6 }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                >
                    <IconChevronLeft size={32} stroke={3} />
                </ActionIcon>
            </Box>

            {/* 截图滚动区域：去除两端 margin */}
            <Box
                ref={scrollRef}
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    overflowX: 'hidden',
                    height: '100%',
                    padding: '8px 10px',
                    boxSizing: 'border-box',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                {screenshots.map(s => (
                    <Box key={s.filename}
                        onClick={() => { onScreenshotClick(s.timestamp); }}
                        style={{ height: '100%', flexShrink: 0 }}
                    >
                        <ScreenshotCard
                            screenshot={s}
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

            {/* 右翻页：贯穿式按钮 */}
            <Box
                className="nav-control-right"
                style={{
                    position: 'absolute', top: 0, right: 0, bottom: 0, width: 80,
                    zIndex: 10, pointerEvents: 'none',
                    background: 'linear-gradient(to left, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                    opacity: scrollProgress >= 99 ? 0 : 1, // 在最右侧时隐藏
                    transition: 'opacity 0.3s'
                }}
            >
                <ActionIcon
                    variant="subtle" color="gray" size="xl"
                    onClick={() => handlePage('next')}
                    style={{ pointerEvents: 'auto', opacity: 0.6 }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                >
                    <IconChevronRight size={32} stroke={3} />
                </ActionIcon>
            </Box>

            {/*  底部红色进度条  */}
            <Box style={{
                position: 'absolute',
                bottom: 2,
                left: 10,
                right: 10,
                height: 2,
                backgroundColor: 'rgba(255,255,255,0.05)',
                zIndex: 15,
                borderRadius: 1
            }}>
                <Box style={{
                    height: '100%',
                    width: `${scrollProgress}%`,
                    backgroundColor: '#ff0000',
                    transition: 'width 0.1s ease-out',
                    borderRadius: 1
                }} />
            </Box>
        </Box>
    );
}