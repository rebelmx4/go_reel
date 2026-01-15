import { Box, Image, Text, Tooltip } from '@mantine/core';
import { Tag } from '../../../../shared/models';
import { toFileUrl } from '../../utils/pathUtils';

interface TagCardProps {
    tag: Tag;
    onClick?: (tag: Tag) => void;
    onRemove?: (tag: Tag) => void;
    draggable?: boolean;
    onDragStart?: (tag: Tag) => void;
    showRemove?: boolean;
    dimmed?: boolean;
    shortcutKey?: string;
}


export function TagCard({
    tag,
    onClick,
    onRemove,
    draggable = false,
    onDragStart,
    showRemove = false,
    dimmed = false,
    shortcutKey
}: TagCardProps) {

    const handleDragStart = (e: React.DragEvent) => {
        if (!draggable) return;
        e.dataTransfer.effectAllowed = 'move';
        // 传递 JSON 字符串
        e.dataTransfer.setData('application/json', JSON.stringify(tag));
        onDragStart?.(tag);
    };

    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove?.(tag);
    };

    return (
        <Tooltip
            label={tag.description || tag.keywords}
            disabled={!tag.description}
            position="top"
            openDelay={500}
        >
            <Box
                draggable={draggable}
                onDragStart={handleDragStart}
                onClick={() => onClick?.(tag)}
                style={{
                    position: 'relative',
                    cursor: onClick || draggable ? 'pointer' : 'default',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid #333',
                    transition: 'all 0.15s ease',
                    opacity: dimmed ? 0.4 : 1,
                    backgroundColor: '#1a1a1a',
                    // 防止文字被选中干扰拖拽
                    userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                    if (onClick || draggable) {
                        e.currentTarget.style.borderColor = '#00ff00';
                        e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 255, 0, 0.2)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#333';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                {/* 快捷键标识 (0-9, Q, W, E...) */}
                {shortcutKey && (
                    <Box
                        style={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            backgroundColor: 'rgba(0, 255, 0, 0.8)',
                            color: '#000',
                            padding: '1px 5px',
                            borderRadius: 3,
                            fontSize: 10,
                            fontWeight: 800,
                            zIndex: 10,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}
                    >
                        {shortcutKey}
                    </Box>
                )}

                {/* 描述信息指示器 (右上角小蓝点或图标) */}
                {tag.description && (
                    <Box
                        style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#339af0',
                            zIndex: 10,
                        }}
                    />
                )}

                {/* 删除按钮 (ⓧ) */}
                {showRemove && (
                    <Box
                        onClick={handleRemoveClick}
                        style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#ff4d4f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            zIndex: 11,
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)'}
                    >
                        ⓧ
                    </Box>
                )}

                {/* 封面图片 */}
                <Image
                    src={toFileUrl(tag.imagePath)}
                    alt={tag.keywords}
                    fit="cover"
                    height={90} // 16:9 比例下的合理高度
                    fallbackSrc="https://placehold.co/160x90/1a1a1a/666?text=No+Image"
                />

                {/* 关键词文本区 */}
                <Box style={{ padding: '4px 6px', backgroundColor: '#25262b' }}>
                    <Text
                        size="xs"
                        fw={500}
                        truncate
                        style={{ color: '#eee', textAlign: 'center' }}
                    >
                        {tag.keywords}
                    </Text>
                </Box>
            </Box>
        </Tooltip>
    );
}