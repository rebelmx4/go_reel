import { Box, Tooltip, Button } from '@mantine/core'; // 【修改1】引入 Button
import { IconPhoto, IconTrash, IconCheck } from '@tabler/icons-react';
import { Screenshot } from '../stores/screenshotStore';

interface ScreenshotCardProps {
    screenshot: Screenshot;
    isActive: boolean;
    isCover: boolean;
    rotation: number;
    onClick: (timestamp: number) => void;
    onSetCover: (screenshot: Screenshot) => void;
    onDelete: (screenshot: Screenshot) => void;
}

const formatMSTime = (ms: number) => {
    // ... (此函数保持不变)
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
    onClick,
    onSetCover,
    onDelete,
}: ScreenshotCardProps) {
    return (
        <Box
            id={`screenshot-${screenshot.filename}`}
            onClick={() => onClick(screenshot.timestamp)}
            className="screenshot-card-container"
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
                height: '100px',
                width: `${100 * 16 / 9}px`
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
                    transition: 'transform 0.3s ease, filter 0.2s ease-in-out', // 【修改2】添加 filter 过渡效果
                }}
                className="screenshot-card-image" // 添加类名用于 CSS 控制
            />

            {/* 【修改3】悬停时显示的按钮容器，将 ActionIcon 替换为 Button */}
            <Box className="screenshot-card-overlay"
                style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%',
                    // 背景色移除，改为通过模糊图片实现
                    display: 'flex',
                    flexDirection: 'column', // 改为纵向排列
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8, // 调整按钮间距
                    opacity: 0,
                    transition: 'opacity 0.2s ease-in-out',
                    pointerEvents: 'none', // 默认情况下遮罩层不响应鼠标事件
                }}
            >
                <Button
                    leftSection={isCover ? <IconCheck size={16} /> : <IconPhoto size={16} />}
                    color={isCover ? "green" : "blue"}
                    size="compact-sm"
                    onClick={(e) => { e.stopPropagation(); onSetCover(screenshot); }}
                    style={{ pointerEvents: 'auto' }} // 让按钮可以被点击
                >
                    {isCover ? "当前封面" : "设为封面"}
                </Button>

                <Button
                    leftSection={<IconTrash size={16} />}
                    color="red"
                    size="compact-sm"
                    onClick={(e) => { e.stopPropagation(); onDelete(screenshot); }}
                    style={{ pointerEvents: 'auto' }} // 让按钮可以被点击
                >
                    删除
                </Button>
            </Box>

            {/* 底部时间戳 */}
            <Box style={{
                position: 'absolute', bottom: 0, left: 0,
                width: '100%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: 'white',
                fontSize: '12px',
                textAlign: 'center',
                padding: '2px 0',
            }}>
                {formatMSTime(screenshot.timestamp)}
            </Box>
        </Box>
    );
}