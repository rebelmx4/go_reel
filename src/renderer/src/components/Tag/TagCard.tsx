import { Box, Image, Text, Tooltip } from '@mantine/core';
import { Tag } from '../../stores';

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
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify(tag));
        onDragStart?.(tag);
    };

    const handleClick = () => {
        onClick?.(tag);
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
        >
            <Box
                draggable={draggable}
                onDragStart={handleDragStart}
                onClick={handleClick}
                style={{
                    position: 'relative',
                    cursor: onClick || draggable ? 'pointer' : 'default',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '2px solid #444',
                    transition: 'all 0.2s',
                    opacity: dimmed ? 0.5 : 1,
                    backgroundColor: '#1a1a1a',
                }}
                onMouseEnter={(e) => {
                    if (onClick || draggable) {
                        e.currentTarget.style.borderColor = '#00ff00';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#444';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                {/* Shortcut key badge */}
                {shortcutKey && (
                    <Box
                        style={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                            zIndex: 2,
                        }}
                    >
                        {shortcutKey}
                    </Box>
                )}

                {/* Description indicator */}
                {tag.description && (
                    <Box
                        style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            color: '#000',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 'bold',
                            zIndex: 2,
                        }}
                    >
                        !
                    </Box>
                )}

                {/* Remove button */}
                {showRemove && (
                    <Box
                        onClick={handleRemoveClick}
                        style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            backgroundColor: 'rgba(255, 0, 0, 0.8)',
                            color: '#fff',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            zIndex: 2,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
                        }}
                    >
                        ⓧ
                    </Box>
                )}

                {/* Cover image */}
                <Image
                    src={tag.imagePath}
                    alt={tag.keywords}
                    fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3C/svg%3E"
                    style={{
                        width: '100%',
                        aspectRatio: '16/9',
                        objectFit: 'cover',
                        backgroundColor: '#333',
                    }}
                />

                {/* Keywords */}
                <Text
                    size="sm"
                    style={{
                        padding: '4px 8px',
                        textAlign: 'center',
                        color: '#fff',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    }}
                >
                    {tag.keywords}
                </Text>
            </Box>
        </Tooltip>
    );
}
