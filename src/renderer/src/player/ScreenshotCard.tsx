import { Box, ActionIcon } from '@mantine/core';
import { IconPhoto, IconTrash, IconCheck } from '@tabler/icons-react';
import { Screenshot } from '../stores/screenshotStore';
import { useState, useMemo } from 'react';

interface ScreenshotCardProps {
    screenshot: Screenshot;
    isActive: boolean;
    isCover: boolean;
    rotation: number;
    onSetCover: (screenshot: Screenshot) => void;
    onDelete: (screenshot: Screenshot) => void;
}

const formatMSTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
};

export function ScreenshotCard({
    screenshot,
    isActive,
    isCover,
    rotation,
    onSetCover,
    onDelete,
}: ScreenshotCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

    const isRotatedVertical = (rotation / 90) % 2 !== 0;

    // 计算容器宽度：
    // 如果旋转了90/270度，视觉宽度 = 高度 / 原始宽高比
    // 如果是0/180度，视觉宽度 = 高度 * 原始宽高比
    const cardHeight = 320;
    const cardWidth = useMemo(() => {
        if (isRotatedVertical) {
            return cardHeight / aspectRatio;
        }
        return cardHeight * aspectRatio;
    }, [aspectRatio, isRotatedVertical, cardHeight]);

    return (
        <Box
            id={`screenshot-${screenshot.filename}`}
            className="screenshot-card-container"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'relative',
                cursor: 'pointer',
                border: `3px solid ${isActive ? 'red' : 'transparent'}`,
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
                transition: 'width 0.3s ease, border-color 0.2s', // 宽度变化也加个过渡
                backgroundColor: '#000',
                height: `${cardHeight}px`,
                width: `${cardWidth}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <img
                src={screenshot.path}
                alt="Screenshot"
                onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalHeight > 0) {
                        setAspectRatio(img.naturalWidth / img.naturalHeight);
                    }
                }}
                style={{
                    position: 'absolute',
                    // 当旋转 90/270度时，图片的长边要对齐容器的短边，反之亦然
                    // 这里直接用 scale 配合旋转是最简单的做法
                    width: isRotatedVertical ? `${cardHeight}px` : '100%',
                    height: isRotatedVertical ? `${cardWidth}px` : '100%',
                    objectFit: 'cover',
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.3s ease, width 0.3s ease, height 0.3s ease, filter 0.2s ease-in-out',
                }}
                className="screenshot-card-image"
            />

            {/* 底部信息栏层级设高一点 */}
            <Box style={{
                position: 'absolute', bottom: 0, left: 0,
                boxSizing: 'border-box',
                width: '100%',
                backgroundColor: 'rgba(0,0,0,0.3)', // 加一点极浅阴影增强文字识别
                color: 'white',
                fontSize: '12px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textShadow: '0px 1px 3px rgba(0,0,0,1)',
                pointerEvents: 'none',
                zIndex: 2
            }}>
                <span style={{ fontWeight: 500 }}>{formatMSTime(screenshot.timestamp)}</span>

                {isHovered && (
                    <Box style={{ display: 'flex', gap: '4px', pointerEvents: 'auto' }}>
                        <ActionIcon
                            variant="filled"
                            size="sm"
                            color={isCover ? "green" : "blue"}
                            onClick={(e) => { e.stopPropagation(); onSetCover(screenshot); }}
                            title={isCover ? "当前封面" : "设为封面"}
                        >
                            {isCover ? <IconCheck size={16} /> : <IconPhoto size={16} />}
                        </ActionIcon>
                        <ActionIcon
                            variant="filled"
                            size="sm"
                            color="red"
                            onClick={(e) => { e.stopPropagation(); onDelete(screenshot); }}
                            title="删除"
                        >
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Box>
                )}
            </Box>
        </Box>
    );
}