import { useState, useCallback, useEffect } from 'react';
import { Modal, Box, Text, TextInput, Textarea, Button, Group, Image, ScrollArea } from '@mantine/core';
import { useTagStore, Tag } from '../../stores';
import { TagCard } from '../Tag/TagCard';
import { TagFilterGrid } from '../Tag/TagFilterGrid';

interface CreateTagDialogProps {
    opened: boolean;
    onClose: () => void;
    coverImage: string; // Base64 or URL
    videoId?: number;
    assignedTagIds: number[];
    onCreated?: (tag: Tag) => void;
}

export function CreateTagDialog({
    opened,
    onClose,
    coverImage,
    assignedTagIds,
    onCreated
}: CreateTagDialogProps) {
    const [keywords, setKeywords] = useState('');
    const [description, setDescription] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('');
    const [groupFilter, setGroupFilter] = useState('');
    const [cover, setCover] = useState(coverImage);

    const tagsData = useTagStore((state) => state.tagsData);
    const addTag = useTagStore((state) => state.addTag);
    const isKeywordUnique = useTagStore((state) => state.isKeywordUnique);
    const getTagById = useTagStore((state) => state.getTagById);
    const getAllGroups = useTagStore((state) => state.getAllGroups);

    // Get assigned tags for this video
    const assignedTags = assignedTagIds
        .map(id => getTagById(id))
        .filter((t): t is Tag => t !== undefined);

    // Get all groups
    const allGroups = getAllGroups();

    // Filter groups based on input
    const filteredGroups = groupFilter
        ? allGroups.filter(g => g.toLowerCase().includes(groupFilter.toLowerCase()))
        : allGroups;

    // Check if creating new group
    const isNewGroup = groupFilter && !allGroups.some(g => g.toLowerCase() === groupFilter.toLowerCase());

    // Handle paste for cover replacement
    const handlePaste = useCallback((e: ClipboardEvent) => {
        const text = e.clipboardData?.getData('text');
        if (text && (text.startsWith('http') || text.startsWith('data:image'))) {
            setCover(text);
        }
    }, []);

    // Register paste listener
    useEffect(() => {
        if (opened) {
            window.addEventListener('paste', handlePaste);
            return () => window.removeEventListener('paste', handlePaste);
        }
    }, [opened, handlePaste]);

    // Handle create
    const handleCreate = async () => {
        // Validation
        if (!keywords.trim()) {
            alert('请输入关键词');
            return;
        }

        if (!isKeywordUnique(keywords.trim())) {
            alert('关键词已存在，请使用其他关键词');
            return;
        }

        if (!selectedGroup && !groupFilter) {
            alert('请选择或创建分组');
            return;
        }

        const finalGroup = selectedGroup || groupFilter;

        try {
            const newTag = await addTag({
                keywords: keywords.trim(),
                description: description.trim() || undefined,
                group: finalGroup,
                imagePath: '' // Will be set after saving cover
            });

            // Save cover image
            if (window.api?.saveTagCover && cover) {
                try {
                    const coverPath = await window.api.saveTagCover(newTag.id, cover);
                    console.log(`Tag cover saved: ${coverPath}`);
                } catch (error) {
                    console.error('Failed to save tag cover:', error);
                }
            }

            // Auto-assign tag to current video
            if (window.api?.saveVideoTags && window.api?.loadVideoTags) {
                try {
                    const currentVideoPath = (window as any).currentVideoPath; // Get from global or prop
                    if (currentVideoPath) {
                        const existingTags = await window.api.loadVideoTags(currentVideoPath);
                        await window.api.saveVideoTags(currentVideoPath, [...existingTags, newTag.id]);
                        console.log(`Tag ${newTag.id} assigned to video`);
                    }
                } catch (error) {
                    console.error('Failed to assign tag to video:', error);
                }
            }

            onCreated?.(newTag);
            handleClose();
        } catch (error) {
            console.error('Failed to create tag:', error);
            alert('创建标签失败');
        }
    };

    const handleClose = () => {
        setKeywords('');
        setDescription('');
        setSelectedGroup('');
        setGroupFilter('');
        setCover(coverImage);
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title="新建标签"
            size="xl"
            styles={{
                body: { padding: 0 },
                header: { backgroundColor: '#1a1a1a', borderBottom: '1px solid #333' }
            }}
        >
            <Box style={{ display: 'flex', height: '70vh' }}>
                {/* Left: Creation Pane */}
                <Box style={{ width: '50%', padding: 20, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Cover Preview */}
                    <Box>
                        <Text size="sm" fw={600} mb={8}>封面预览 (Ctrl+V 替换)</Text>
                        <Image
                            src={cover}
                            alt="Cover"
                            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23333' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23999'%3E封面图片%3C/text%3E%3C/svg%3E"
                            style={{
                                width: '100%',
                                aspectRatio: '16/9',
                                objectFit: 'cover',
                                borderRadius: 8,
                                border: '2px solid #444',
                            }}
                        />
                    </Box>

                    {/* Keywords Input */}
                    <Box>
                        <Text size="sm" fw={600} mb={4}>
                            * 关键词 (必填)
                        </Text>
                        <TextInput
                            placeholder="输入关键词以创建或过滤..."
                            value={keywords}
                            onChange={(e) => setKeywords(e.currentTarget.value)}
                            error={keywords && !isKeywordUnique(keywords.trim()) ? '关键词已存在' : undefined}
                        />
                    </Box>

                    {/* Description Input */}
                    <Box>
                        <Text size="sm" fw={600} mb={4}>
                            描述 (可选)
                        </Text>
                        <Textarea
                            placeholder="输入标签的详细描述..."
                            value={description}
                            onChange={(e) => setDescription(e.currentTarget.value)}
                            minRows={3}
                        />
                    </Box>

                    {/* Group Selection */}
                    <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Text size="sm" fw={600} mb={4}>
                            * 归属分组 (必填)
                        </Text>
                        <TextInput
                            placeholder="🔍 过滤或创建分组..."
                            value={groupFilter}
                            onChange={(e) => {
                                setGroupFilter(e.currentTarget.value);
                                setSelectedGroup('');
                            }}
                            mb={8}
                        />
                        <ScrollArea style={{ flex: 1, border: '1px solid #444', borderRadius: 4 }}>
                            <Box style={{ padding: 8 }}>
                                {isNewGroup && (
                                    <Box
                                        onClick={() => {
                                            setSelectedGroup(groupFilter);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            backgroundColor: selectedGroup === groupFilter ? '#2a2a2a' : 'transparent',
                                            color: '#00ff00',
                                            marginBottom: 4,
                                        }}
                                    >
                                        + 创建新分组 "{groupFilter}"
                                    </Box>
                                )}
                                {filteredGroups.map(group => (
                                    <Box
                                        key={group}
                                        onClick={() => setSelectedGroup(group)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            backgroundColor: selectedGroup === group ? '#2a2a2a' : 'transparent',
                                            transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedGroup !== group) {
                                                e.currentTarget.style.backgroundColor = '#1a1a1a';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedGroup !== group) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        {group}
                                    </Box>
                                ))}
                            </Box>
                        </ScrollArea>
                    </Box>
                </Box>

                {/* Right: Reference Pane */}
                <Box style={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
                    {/* Assigned Tags for This Video */}
                    <Box style={{ padding: 16, borderBottom: '1px solid #333' }}>
                        <Text size="sm" fw={600} mb={8} c="dimmed">
                            本视频已分配标签 ({assignedTags.length})
                        </Text>
                        <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 60 }}>
                            {assignedTags.map(tag => (
                                <Box key={tag.id} style={{ width: 100 }}>
                                    <TagCard tag={tag} />
                                </Box>
                            ))}
                            {assignedTags.length === 0 && (
                                <Text size="sm" c="dimmed">暂无分配的标签</Text>
                            )}
                        </Box>
                    </Box>

                    {/* Tag Library */}
                    <Box style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
                        <Text size="sm" fw={600} mb={8} c="dimmed">
                            标签库 (过滤结果)
                        </Text>
                        <Box style={{ height: 'calc(100% - 30px)' }}>
                            <TagFilterGrid
                                allTagsData={tagsData}
                                filterKeyword={keywords}
                                excludedIds={new Set()}
                            />
                        </Box>
                    </Box>
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
                    <Button variant="subtle" onClick={handleClose}>
                        取消
                    </Button>
                    <Button onClick={handleCreate}>
                        确定
                    </Button>
                </Group>
            </Box>
        </Modal>
    );
}
