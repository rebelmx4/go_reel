import { Box, ActionIcon } from '@mantine/core'; // 注意：将 Button 替换为 ActionIcon
import { IconPhoto, IconTrash, IconCheck } from '@tabler/icons-react';
import { Screenshot } from '../stores/screenshotStore';
import { useState } from 'react';

interface ScreenshotCardProps {
    screenshot: Screenshot;
    isActive: boolean;
    isCover: boolean;
    rotation: number;
    onSetCover: (screenshot: Screenshot) => void;
    onDelete: (screenshot: Screenshot) => void;
}

// 格式化毫秒时间为 "分钟:秒" 或 "小时:分钟:秒"
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

// ... 其他导入保持不变

export function ScreenshotCard({
    screenshot,
    isActive,
    isCover,
    rotation,
    onSetCover,
    onDelete,
}: ScreenshotCardProps) {
    const [isHovered, setIsHovered] = useState(false);

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
                transition: 'border-color 0.2s, transform 0.2s',
                backgroundColor: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '280px',
                width: `${280 * 16 / 9}px`
            }}
        >
            <img
                src={screenshot.path}
                alt="Screenshot"
                style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.3s ease, filter 0.2s ease-in-out',
                }}
                className="screenshot-card-image"
            />

            {/* 修改后的底部栏：去掉了 backgroundColor */}
            <Box style={{
                position: 'absolute', bottom: 0, left: 0,
                boxSizing: 'border-box',
                width: '100%',
                backgroundColor: 'transparent', // 【修改】这里改为透明
                color: 'white',
                fontSize: '12px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                // 添加文字阴影，确保在浅色图片上也能看清时间
                textShadow: '0px 1px 3px rgba(0,0,0,0.8)',
                pointerEvents: 'none', // 允许点击穿透到底部，除非是内部的按钮
            }}>
                {/* 时间戳 */}
                <span style={{ fontWeight: 500 }}>{formatMSTime(screenshot.timestamp)}</span>

                {/* 图标容器 */}
                {isHovered && (
                    <Box style={{
                        display: 'flex',
                        gap: '4px',
                        pointerEvents: 'auto' // 恢复按钮的可点击性
                    }}>
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