import { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Text, TextInput, Textarea, Button, Group, Image, ScrollArea, UnstyledButton, Stack } from '@mantine/core';
import { IconPlus, IconCheck } from '@tabler/icons-react';
import { useTagStore } from '../../stores/tagStore';
import { TagCard } from '../Tag/TagCard';
import { TagFilterGrid } from '../Tag/TagFilterGrid';
import { useVideoFileRegistryStore, useVideoFileItem } from '../../stores/videoFileRegistryStore';
import { usePlaylistStore } from '../../stores/playlistStore';

interface TagInfoViewProps {
    cover: string;              // 裁剪后的 Base64 图像
    setCover: (s: string) => void; // 用于 Ctrl+V 替换图片
    onClose: () => void;
    onCreated?: (tag: any) => void;
}

export function TagInfoView({ cover, setCover, onClose, onCreated }: TagInfoViewProps) {
    // --- 1. 状态管理 ---
    const [keywords, setKeywords] = useState('');
    const [description, setDescription] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [groupSearch, setGroupSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- 2. Store 数据订阅 ---
    const { tagsData, addTag, isKeywordUnique, getTagById, getAllGroups } = useTagStore();
    const currentPath = usePlaylistStore(s => s.currentPath);
    const videoItem = useVideoFileItem(currentPath || '');
    const updateAnnotation = useVideoFileRegistryStore(s => s.updateAnnotation);

    // 计算已分配标签
    const assignedTags = useMemo(() => {
        const ids = videoItem?.annotation?.tags || [];
        return ids.map(id => getTagById(id)).filter(t => !!t);
    }, [videoItem, getTagById]);

    // 分组逻辑
    const allGroups = getAllGroups();
    const filteredGroups = useMemo(() =>
        allGroups.filter(g => g.toLowerCase().includes(groupSearch.toLowerCase())),
        [allGroups, groupSearch]);

    const showCreateGroupOption = groupSearch && !allGroups.some(g => g.toLowerCase() === groupSearch.toLowerCase());

    // --- 3. 粘贴图片逻辑 (Ctrl+V) ---
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

    // --- 4. 提交创建 ---
    const handleCreate = async () => {
        const trimmedKey = keywords.trim();
        const finalGroup = selectedGroup || (showCreateGroupOption ? groupSearch.trim() : '');

        if (!trimmedKey || !finalGroup) return;
        if (!isKeywordUnique(trimmedKey)) return;

        setIsSubmitting(true);
        try {
            // 1. 保存到标签库
            const newTag = await addTag({
                keywords: trimmedKey,
                group: finalGroup,
                description: description.trim(),
                imageBase64: cover
            });

            // 2. 关联到当前视频
            if (newTag && currentPath) {
                const existingTagIds = videoItem?.annotation?.tags || [];
                await updateAnnotation(currentPath, {
                    tags: [...existingTagIds, newTag.id]
                });
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

                {/* 左侧：表单区 */}
                <Stack style={{ width: '45%', padding: 20, borderRight: '1px solid #333', overflowY: 'auto' }} gap="md">
                    <Box>
                        <Text size="xs" c="dimmed" fw={700} mb={5}>标签封面 (裁剪结果 / Ctrl+V 可替换)</Text>
                        <Image
                            src={cover}
                            radius="md"
                            fit="contain"
                            style={{ border: '2px solid #333', maxHeight: '250px', backgroundColor: '#000' }}
                        />
                    </Box>

                    <TextInput
                        label="关键词 (必填)"
                        placeholder="标签名称，需全局唯一"
                        value={keywords}
                        onChange={(e) => setKeywords(e.currentTarget.value)}
                        error={keywords && !isKeywordUnique(keywords) ? '该关键词已存在' : null}
                        data-autofocus
                    />

                    <Textarea
                        label="描述 (可选)"
                        placeholder="补充标签说明..."
                        value={description}
                        onChange={(e) => setDescription(e.currentTarget.value)}
                        minRows={2}
                    />

                    <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Text size="sm" fw={500} mb={5}>归属分组 (必填)</Text>
                        <TextInput
                            placeholder="🔍 搜索或输入新分组..."
                            value={groupSearch}
                            onChange={(e) => {
                                setGroupSearch(e.currentTarget.value);
                                if (selectedGroup) setSelectedGroup('');
                            }}
                            mb={5}
                            size="xs"
                        />
                        <ScrollArea style={{ flex: 1, border: '1px solid #333', borderRadius: 4, backgroundColor: '#1a1b1e' }}>
                            <Stack gap={2} p={4}>
                                {showCreateGroupOption && (
                                    <UnstyledButton
                                        onClick={() => setSelectedGroup(groupSearch)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: 4,
                                            backgroundColor: selectedGroup === groupSearch ? '#2b8a3e' : 'transparent',
                                            color: selectedGroup === groupSearch ? 'white' : '#40c057'
                                        }}
                                    >
                                        <Group gap="xs"><IconPlus size={14} /><Text size="sm">创建分组 "{groupSearch}"</Text></Group>
                                    </UnstyledButton>
                                )}
                                {filteredGroups.map(group => (
                                    <UnstyledButton
                                        key={group}
                                        onClick={() => { setSelectedGroup(group); setGroupSearch(group); }}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: 4,
                                            backgroundColor: selectedGroup === group ? '#333' : 'transparent',
                                        }}
                                    >
                                        <Group justify="space-between">
                                            <Text size="sm">{group}</Text>
                                            {selectedGroup === group && <IconCheck size={14} color="#00ff00" />}
                                        </Group>
                                    </UnstyledButton>
                                ))}
                            </Stack>
                        </ScrollArea>
                    </Box>
                </Stack>

                {/* 右侧：参考区 */}
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

                    <Box p="md" style={{ flex: 1, overflow: 'hidden' }}>
                        <Text size="xs" fw={700} c="dimmed" mb="xs">标签库实时参考 (过滤: {keywords || '无'})</Text>
                        <Box style={{ height: 'calc(100% - 25px)' }}>
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