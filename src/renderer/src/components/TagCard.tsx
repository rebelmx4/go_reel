import { Box, Image, Text, Tooltip, ActionIcon } from '@mantine/core';
import { IconAlertCircle, IconX } from '@tabler/icons-react';

export interface TagCardProps {
    tag: {
        id: number;
        keywords: string;
        description?: string;
        imagePath: string;
    };
    onClick?: () => void;
    onRemove?: () => void;
    showRemove?: boolean;
    hotkey?: string; // For pinned tags: '1', '2', 'Q', etc.
    isDraggable?: boolean;
}

/**
 * Tag Card Component
 * Displays tag with cover image, keyword, and optional description indicator
 */
export function TagCard({
    tag,
    onClick,
    onRemove,
    showRemove = false,
    hotkey,
    isDraggable = false
}: TagCardProps) {
    return (
        <Box
            style={{
                position: 'relative',
                width: 120,
                cursor: onClick ? 'pointer' : 'default',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid var(--mantine-color-gray-3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            draggable={isDraggable}
            onClick={onClick}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Hotkey badge (for pinned tags) */}
            {hotkey && (
                <Box
                    style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        zIndex: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 700,
                    }}
                >
                    {hotkey}
                </Box>
            )}

            {/* Description indicator */}
            {tag.description && (
                <Tooltip label={tag.description} position="top" withArrow>
                    <Box
                        style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            zIndex: 2,
                        }}
                    >
                        <IconAlertCircle
                            size={20}
                            style={{
                                color: '#ffd700',
                                filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
                            }}
                        />
                    </Box>
                </Tooltip>
            )}

            {/* Remove button */}
            {showRemove && onRemove && (
                <ActionIcon
                    size="sm"
                    variant="filled"
                    color="red"
                    style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        zIndex: 2,
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                >
                    <IconX size={14} />
                </ActionIcon>
            )}

            {/* Cover image */}
            <Image
                src={tag.imagePath}
                alt={tag.keywords}
                height={90}
                fit="cover"
                fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='90'%3E%3Crect fill='%23ddd' width='120' height='90'/%3E%3C/svg%3E"
            />

            {/* Keyword */}
            <Text
                size="sm"
                fw={500}
                ta="center"
                p={4}
                style={{
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    borderTop: '1px solid var(--mantine-color-gray-3)',
                }}
            >
                {tag.keywords}
            </Text>
        </Box>
    );
}
