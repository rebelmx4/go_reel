// src/renderer/src/player/components/TagInfoView.tsx
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Text, TextInput, Textarea, Button, Group, Image, ScrollArea, UnstyledButton, Stack, Badge } from '@mantine/core';
import { IconPlus, IconCheck } from '@tabler/icons-react';
import { useTagStore } from '../../stores/tagStore';
import { TagCard } from '../Tag/TagCard';
import { TagFilterGrid } from '../Tag/TagFilterGrid';
import { useVideoFileRegistryStore, useVideoFileItem } from '../../stores/videoFileRegistryStore';
import { usePlaylistStore } from '../../stores/playlistStore';

interface TagInfoViewProps {
    cover: string;
    setCover: (s: string) => void;
    onClose: () => void;
    onCreated?: (tag: any) => void;
}

export function TagInfoView({ cover, setCover, onClose, onCreated }: TagInfoViewProps) {
    const [keywords, setKeywords] = useState('');
    const [description, setDescription] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [groupSearch, setGroupSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { tagsData, addTag, isKeywordUnique, getTagById, getAllGroups } = useTagStore();
    const currentPath = usePlaylistStore(s => s.currentPath);
    const videoItem = useVideoFileItem(currentPath || '');
    const updateAnnotation = useVideoFileRegistryStore(s => s.updateAnnotation);

    const assignedTags = useMemo(() => {
        const ids = videoItem?.annotation?.tags || [];
        return ids.map(id => getTagById(id)).filter(t => !!t);
    }, [videoItem, getTagById]);

    const allGroups = getAllGroups();
    const filteredGroups = useMemo(() =>
        allGroups.filter(g => g.toLowerCase().includes(groupSearch.toLowerCase())),
        [allGroups, groupSearch]);

    const showCreateGroupOption = groupSearch && !allGroups.some(g => g.toLowerCase() === groupSearch.toLowerCase());

    const handlePaste = useCallback((e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (event.target?.result) setCover(event.target.result as string);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    }, [setCover]);

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handlePaste]);

    const handleCreate = async () => {
        const trimmedKey = keywords.trim();
        const finalGroup = selectedGroup || (showCreateGroupOption ? groupSearch.trim() : '');
        if (!trimmedKey || !finalGroup || !isKeywordUnique(trimmedKey)) return;

        setIsSubmitting(true);
        try {
            const newTag = await addTag({
                keywords: trimmedKey,
                group: finalGroup,
                description: description.trim(),
                imageBase64: cover
            });
            if (newTag && currentPath) {
                const existingTagIds = videoItem?.annotation?.tags || [];
                await updateAnnotation(currentPath, { tags: [...existingTagIds, newTag.id] });
                onCreated?.(newTag);
            }
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box style={{ display: 'flex', height: '80vh', flexDirection: 'column', backgroundColor: '#141517' }}>
            <Box style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* 左侧：表单区 - 独立滚动 */}
                <Box style={{ width: '45%', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                    <ScrollArea style={{ flex: 1 }} p="md">
                        <Stack gap="md">
                            <Box>
                                <Text size="xs" c="dimmed" fw={700} mb={5}>标签封面 (Ctrl+V 可替换)</Text>
                                <Image
                                    src={cover}
                                    radius="md"
                                    fit="contain"
                                    style={{ border: '2px solid #333', maxHeight: '200px', backgroundColor: '#000' }}
                                />
                            </Box>

                            <TextInput
                                label="关键词 (必填)"
                                placeholder="标签名称..."
                                value={keywords}
                                onChange={(e) => setKeywords(e.currentTarget.value)}
                                error={keywords && !isKeywordUnique(keywords) ? '该关键词已存在' : null}
                            />

                            <Textarea
                                label="描述 (可选)"
                                placeholder="补充说明..."
                                value={description}
                                onChange={(e) => setDescription(e.currentTarget.value)}
                                minRows={2}
                            />

                            <Box>
                                <Text size="sm" fw={500} mb={5}>归属分组 (必填)</Text>
                                <TextInput
                                    placeholder="🔍 搜索或输入新分组名称..."
                                    value={groupSearch}
                                    onChange={(e) => {
                                        setGroupSearch(e.currentTarget.value);
                                        // 搜索时清除之前的选中，除非完全匹配
                                        if (selectedGroup !== e.currentTarget.value) setSelectedGroup('');
                                    }}
                                    mb="sm"
                                    size="xs"
                                />

                                {/* 自动宽度标签布局 */}
                                <Group gap="xs">
                                    {showCreateGroupOption && (
                                        <UnstyledButton
                                            onClick={() => setSelectedGroup(groupSearch)}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: '4px',
                                                border: '1px dashed #40c057',
                                                backgroundColor: selectedGroup === groupSearch ? 'rgba(64, 192, 87, 0.2)' : 'transparent',
                                            }}
                                        >
                                            <Group gap={4}>
                                                <IconPlus size={12} color="#40c057" />
                                                <Text size="xs" c="green.4">创建 "{groupSearch}"</Text>
                                            </Group>
                                        </UnstyledButton>
                                    )}

                                    {filteredGroups.map(group => {
                                        const isSelected = selectedGroup === group;
                                        return (
                                            <UnstyledButton
                                                key={group}
                                                onClick={() => {
                                                    setSelectedGroup(group);
                                                    setGroupSearch(group);
                                                }}
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '4px',
                                                    backgroundColor: isSelected ? '#2C2E33' : '#1A1B1E',
                                                    border: `1px solid ${isSelected ? '#4dabf7' : '#373A40'}`,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <Group gap={6}>
                                                    <Text size="xs" c={isSelected ? 'blue.4' : 'gray.3'}>{group}</Text>
                                                    {isSelected && <IconCheck size={12} color="#4dabf7" />}
                                                </Group>
                                            </UnstyledButton>
                                        );
                                    })}
                                </Group>
                            </Box>
                        </Stack>
                    </ScrollArea>
                </Box>

                {/* 右侧：参考区 - 独立滚动 */}
                <Box style={{ width: '55%', display: 'flex', flexDirection: 'column', backgroundColor: '#0b0c0d' }}>
                    <Box p="md" style={{ borderBottom: '1px solid #333' }}>
                        <Text size="xs" fw={700} c="dimmed" mb="xs">本视频已关联 ({assignedTags.length})</Text>
                        <ScrollArea h={110}>
                            <Group gap="xs">
                                {assignedTags.map(tag => (
                                    <Box key={tag.id} w={120}><TagCard tag={tag} /></Box>
                                ))}
                                {assignedTags.length === 0 && <Text size="xs" c="dimmed" py="xl">尚未分配标签</Text>}
                            </Group>
                        </ScrollArea>
                    </Box>

                    <Box p="md" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <Text size="xs" fw={700} c="dimmed" mb="xs">标签库实时参考 (过滤: {keywords || '无'})</Text>
                        <Box style={{ flex: 1, overflow: 'hidden' }}>
                            <TagFilterGrid allTagsData={tagsData} filterKeyword={keywords} />
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* 底部操作 */}
            <Group justify="flex-end" p="md" style={{ borderTop: '1px solid #333', backgroundColor: '#141517' }}>
                <Button variant="subtle" color="gray" onClick={onClose} disabled={isSubmitting}>取消</Button>
                <Button
                    onClick={handleCreate}
                    loading={isSubmitting}
                    color="green"
                    disabled={!keywords || (!selectedGroup && !showCreateGroupOption)}
                >
                    确定创建
                </Button>
            </Group>
        </Box>
    );
}