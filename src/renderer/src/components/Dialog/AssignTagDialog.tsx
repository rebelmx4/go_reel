import { useState, useCallback } from 'react';
import { Modal, Box, Text, TextInput, Button, Group } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useTagStore, Tag } from '../../stores';
import { TagCard } from '../Tag/TagCard';
import { TagFilterGrid } from '../Tag/TagFilterGrid';

interface AssignTagDialogProps {
    opened: boolean;
    onClose: () => void;
    videoId?: number;
    assignedTagIds: number[];
    onAssign: (tagIds: number[]) => void;
}

const SHORTCUT_KEYS = ['1', '2', '3', '4', '5', 'Q', 'W', 'E', 'R', '~'];

export function AssignTagDialog({
    opened,
    onClose,
    assignedTagIds,
    onAssign
}: AssignTagDialogProps) {
    const [searchKeyword, setSearchKeyword] = useState('');
    const [sessionAssignedIds, setSessionAssignedIds] = useState<Set<number>>(
        new Set(assignedTagIds)
    );

    const tagsData = useTagStore((state) => state.tagsData);
    const pinnedTags = useTagStore((state) => state.pinnedTags);
    const getTagById = useTagStore((state) => state.getTagById);
    const pinTag = useTagStore((state) => state.pinTag);
    const unpinTag = useTagStore((state) => state.unpinTag);

    // Get pinned tag objects
    const pinnedTagObjects = pinnedTags
        .map(p => getTagById(p.tagId))
        .filter((t): t is Tag => t !== undefined);

    // Get assigned tag objects
    const assignedTagObjects = Array.from(sessionAssignedIds)
        .map(id => getTagById(id))
        .filter((t): t is Tag => t !== undefined);

    // Excluded IDs = pinned + assigned
    const excludedIds = new Set([
        ...pinnedTags.map(p => p.tagId),
        ...sessionAssignedIds
    ]);

    // Handle tag click from library
    const handleTagClick = useCallback((tag: Tag) => {
        setSessionAssignedIds(prev => new Set([...prev, tag.id]));
    }, []);

    // Handle unassign
    const handleUnassign = useCallback((tag: Tag) => {
        setSessionAssignedIds(prev => {
            const next = new Set(prev);
            next.delete(tag.id);
            return next;
        });
    }, []);

    // Handle pin tag
    const handlePinTag = useCallback((tag: Tag) => {
        if (pinnedTags.length >= 10) {
            alert('常用标签栏已满（最多10个）');
            return;
        }
        const position = pinnedTags.length;
        pinTag(tag.id, position);
    }, [pinnedTags, pinTag]);

    // Handle unpin tag
    const handleUnpinTag = useCallback((tag: Tag) => {
        unpinTag(tag.id);
    }, [unpinTag]);

    // Handle drag drop to pinned area
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const tagData = e.dataTransfer.getData('application/json');
        if (tagData) {
            const tag: Tag = JSON.parse(tagData);
            handlePinTag(tag);
        }
    }, [handlePinTag]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Handle shortcut keys
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const key = e.key.toUpperCase();
        const keyIndex = SHORTCUT_KEYS.findIndex(k => k === key);

        if (keyIndex !== -1 && keyIndex < pinnedTagObjects.length) {
            const tag = pinnedTagObjects[keyIndex];
            if (!sessionAssignedIds.has(tag.id)) {
                setSessionAssignedIds(prev => new Set([...prev, tag.id]));
            }
        }
    }, [pinnedTagObjects, sessionAssignedIds]);

    // Register keyboard shortcuts
    useState(() => {
        if (opened) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    });

    // Handle confirm
    const handleConfirm = async () => {
        // Save pinned tags
        const savePinnedTags = useTagStore.getState().savePinnedTags;
        await savePinnedTags();

        // Save assigned tags
        onAssign(Array.from(sessionAssignedIds));
        onClose();
    };

    // Handle cancel
    const handleCancel = () => {
        setSessionAssignedIds(new Set(assignedTagIds));
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleCancel}
            title="为当前视频分配标签"
            size="xl"
            styles={{
                body: { padding: 0 },
                header: { backgroundColor: '#1a1a1a', borderBottom: '1px solid #333' }
            }}
        >
            <Box style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
                {/* Pinned Tags Area */}
                <Box
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    style={{
                        padding: 16,
                        backgroundColor: '#0a0a0a',
                        borderBottom: '1px solid #333',
                    }}
                >
                    <Text size="sm" fw={600} mb={8} c="dimmed">
                        常用标签 (拖拽到此处固化，数字键快速分配)
                    </Text>
                    <Box
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: 8,
                            minHeight: 100,
                        }}
                    >
                        {pinnedTagObjects.map((tag, index) => (
                            <TagCard
                                key={tag.id}
                                tag={tag}
                                shortcutKey={SHORTCUT_KEYS[index]}
                                dimmed={sessionAssignedIds.has(tag.id)}
                                showRemove
                                onRemove={handleUnpinTag}
                                onClick={() => {
                                    if (!sessionAssignedIds.has(tag.id)) {
                                        setSessionAssignedIds(prev => new Set([...prev, tag.id]));
                                    }
                                }}
                            />
                        ))}
                    </Box>
                </Box>

                {/* Assigned Tags Area */}
                <Box
                    style={{
                        padding: 16,
                        backgroundColor: '#1a1a1a',
                        borderBottom: '1px solid #333',
                    }}
                >
                    <Text size="sm" fw={600} mb={8} c="dimmed">
                        已分配标签 ({assignedTagObjects.length})
                    </Text>
                    <Box
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            minHeight: 60,
                        }}
                    >
                        {assignedTagObjects.map(tag => (
                            <Box key={tag.id} style={{ width: 120 }}>
                                <TagCard
                                    tag={tag}
                                    showRemove
                                    onRemove={handleUnassign}
                                />
                            </Box>
                        ))}
                        {assignedTagObjects.length === 0 && (
                            <Text size="sm" c="dimmed">暂无分配的标签</Text>
                        )}
                    </Box>
                </Box>

                {/* Tag Library */}
                <Box style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
                    <TextInput
                        placeholder="🔍 搜索标签库..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.currentTarget.value)}
                        leftSection={<IconSearch size={16} />}
                        mb={12}
                    />
                    <Box style={{ height: 'calc(100% - 50px)' }}>
                        <TagFilterGrid
                            allTagsData={tagsData}
                            filterKeyword={searchKeyword}
                            excludedIds={excludedIds}
                            onTagClick={handleTagClick}
                            draggable
                            onTagDragStart={() => { }}
                        />
                    </Box>
                </Box>

                {/* Footer */}
                <Box
                    style={{
                        padding: 16,
                        borderTop: '1px solid #333',
                        backgroundColor: '#1a1a1a',
                    }}
                >
                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={handleCancel}>
                            取消
                        </Button>
                        <Button onClick={handleConfirm}>
                            确定
                        </Button>
                    </Group>
                </Box>
            </Box>
        </Modal>
    );
}
