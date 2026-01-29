// src/renderer/src/components/Screenshot/ScreenshotCard.tsx

import { Box, ActionIcon, Tooltip } from '@mantine/core';
import { IconPhoto, IconTrash, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { Screenshot } from '../stores/screenshotStore';
import { useState, useEffect, useRef } from 'react';
import { formatDuration } from '../utils/format';

interface ScreenshotCardProps {
    screenshot: Screenshot;
    isActive: boolean;
    isCover: boolean;
    rotation: number;
    isRemoved?: boolean;
    mode: 'nav' | 'preview';
    onSetCover: (screenshot: Screenshot) => void;
    onDelete: (screenshot: Screenshot) => void;
}

export function ScreenshotCard({
    screenshot,
    isActive,
    isCover,
    rotation,
    isRemoved,
    mode,
    onSetCover,
    onDelete,
}: ScreenshotCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [visualRotation, setVisualRotation] = useState(rotation);
    const prevRotationRef = useRef(rotation);

    // 平滑旋转处理逻辑
    useEffect(() => {
        const prev = prevRotationRef.current;
        let delta = rotation - prev;
        if (delta === -270) delta = 90;
        else if (delta === 270) delta = -90;
        setVisualRotation(v => v + delta);
        prevRotationRef.current = rotation;
    }, [rotation]);

    const isRotatedVertical = (rotation / 90) % 2 !== 0;

    /**
     * 核心布局策略：
     * 1. 纵向图就是纵向 (9/16)，横向就是横向 (16/9)
     * 2. 导航模式固定高度，预览模式随 Grid 自适应
     */
    const aspectRatio = isRotatedVertical ? '9 / 16' : '16 / 9';
    const navHeight = isRotatedVertical ? 120 : 100;

    return (
        <Box
            id={`screenshot-${screenshot.filename.replace(/\./g, '\\.')}`}
            // ... 鼠标事件 ...
            style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                backgroundColor: '#000',

                // --- 核心修改：高度跟随父容器，宽度根据比例自动计算 ---
                height: '100%',
                aspectRatio: aspectRatio,
                width: 'auto',
                // ------------------------------------------------

                border: isActive
                    ? '2px solid var(--mantine-color-blue-6)'
                    : '2px solid #2C2E33',
                boxShadow: isActive ? '0 0 10px rgba(34, 139, 230, 0.5)' : 'none',
                filter: isRemoved ? 'grayscale(100%) opacity(0.5)' : 'none',
                transition: 'border 0.2s, box-shadow 0.2s, filter 0.3s' // 移除 height 动画防止拉伸时卡顿
            }}
        >
            {/* 选中时的蓝色微光遮罩 (复刻 VideoCard) */}
            {isActive && (
                <Box style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(34, 139, 230, 0.1)',
                    pointerEvents: 'none',
                    zIndex: 2
                }} />
            )}

            {/* 图片主体 */}
            <img
                src={screenshot.path}
                alt="Screenshot"
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    // 关键改动：使用 fill 确保不截断，允许变形
                    objectFit: 'fill',
                    // 当旋转 90/270度时，图片的宽高需要互换物理尺寸以填满容器
                    width: isRotatedVertical ? 'calc(100% / (9/16))' : '100%',
                    height: isRotatedVertical ? 'calc(100% * (9/16))' : '100%',
                    transform: `translate(-50%, -50%) rotate(${visualRotation}deg)`,
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s',
                    filter: isHovered ? 'brightness(0.7)' : 'none',
                }}
            />

            {/* 已删除标记 */}
            {isRemoved && (
                <Box style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 10,
                    backgroundColor: 'rgba(255, 0, 0, 0.8)',
                    borderRadius: '50%',
                    padding: 4,
                    display: 'flex'
                }}>
                    <IconTrash size={12} color="white" />
                </Box>
            )}

            {/* 底部信息与操作栏 (复刻 VideoCard 交互风格) */}
            <Box style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                color: 'white',
                padding: '8px 8px 4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 5,
                opacity: (mode === 'preview' || isHovered) ? 1 : 0,
                transition: 'opacity 0.2s ease',
                pointerEvents: 'none'
            }}>
                {/* 时间戳标签 */}
                <span style={{
                    fontSize: mode === 'nav' ? '10px' : '12px',
                    fontWeight: 600,
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                }}>
                    {formatDuration(screenshot.timestamp, 'ms')}
                </span>

                {/* 操作按钮组 */}
                <Box style={{ display: 'flex', gap: '4px', pointerEvents: 'auto' }}>
                    <Tooltip label={isCover ? "当前封面" : "设为封面"} position="top" withinPortal>
                        <ActionIcon
                            variant={isCover ? "filled" : "subtle"}
                            size="sm"
                            color={isCover ? "green" : "blue"}
                            onClick={(e) => { e.stopPropagation(); onSetCover(screenshot); }}
                        >
                            {isCover ? <IconCheck size={14} /> : <IconPhoto size={14} />}
                        </ActionIcon>
                    </Tooltip>

                    <Tooltip label="删除截图" position="top" withinPortal>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            color="red"
                            onClick={(e) => { e.stopPropagation(); onDelete(screenshot); }}
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Box>
            </Box>
        </Box>
    );
}