import { useState, useCallback, useEffect, useMemo } from 'react';
import { Modal, Box, Text, TextInput, Textarea, Button, Group, Image, ScrollArea, UnstyledButton, Stack } from '@mantine/core';
import { IconPlus, IconCheck } from '@tabler/icons-react';
import { useTagStore } from '../../stores/tagStore';
import { TagCard } from '../Tag/TagCard';
import { TagFilterGrid } from '../Tag/TagFilterGrid';
import { useVideoFileRegistryStore, useVideoFileItem } from '../../stores/videoFileRegistryStore';
import { useCurrentPath } from '../../stores/playlistStore';

interface CreateTagDialogProps {
    opened: boolean;
    onClose: () => void;
    coverImage: string; // 截图生成的 Base64
    assignedTagIds: number[];
    onCreated?: (tag: any) => void;
}

export function CreateTagDialog({
    opened,
    onClose,
    coverImage,
    assignedTagIds,
    onCreated
}: CreateTagDialogProps) {
    // 状态管理
    const [keywords, setKeywords] = useState('');
    const [description, setDescription] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [groupSearch, setGroupSearch] = useState('');
    const [cover, setCover] = useState(coverImage);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Store 数据
    const { tagsData, addTag, isKeywordUnique, getTagById, getAllGroups } = useTagStore();
    // 1. 获取当前正在播放的视频路径 (从播放器 store)
    const currentPath = useCurrentPath();

    // 2. 获取当前视频的完整档案 (通过 Registry Store 的 Hook)
    const videoItem = useVideoFileItem(currentPath);

    // 3. 获取更新函数
    const updateAnnotation = useVideoFileRegistryStore(s => s.updateAnnotation);

    // 1. 已分配标签引用
    const assignedTags = useMemo(() =>
        assignedTagIds.map(id => getTagById(id)).filter(t => !!t),
        [assignedTagIds, getTagById]);

    // 2. 分组过滤逻辑
    const allGroups = getAllGroups();
    const filteredGroups = useMemo(() =>
        allGroups.filter(g => g.toLowerCase().includes(groupSearch.toLowerCase())),
        [allGroups, groupSearch]);

    const showCreateGroupOption = groupSearch && !allGroups.some(g => g.toLowerCase() === groupSearch.toLowerCase());

    // 3. 粘贴替换封面
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
    }, []);

    useEffect(() => {
        if (opened) {
            window.addEventListener('paste', handlePaste);
            setCover(coverImage);
            // 明确返回清理函数
            return () => {
                window.removeEventListener('paste', handlePaste);
            };
        }
        return undefined;
    }, [opened, coverImage, handlePaste]);

    // 4. 执行创建
    const handleCreate = async () => {
        const trimmedKey = keywords.trim();
        const finalGroup = selectedGroup || (showCreateGroupOption ? groupSearch.trim() : '');

        if (!trimmedKey || !finalGroup) return alert('请检查必填项');
        if (!isKeywordUnique(trimmedKey)) return alert('关键词冲突');

        setIsSubmitting(true);
        try {
            // 第一步：调用后端 API 创建标签
            const newTag = await window.api.addTag({
                keywords: trimmedKey,
                group: finalGroup,
                description: description.trim(),
                imageBase64: cover
            });

            // 第二步：关联到视频
            if (newTag && currentPath) {
                // 获取现有的标签 ID 列表
                const existingTagIds = videoItem?.annotation?.tags || [];

                // 使用 Registry Store 的乐观更新，这会自动触发 UI 重绘
                await updateAnnotation(currentPath, {
                    tags: [...existingTagIds, newTag.id]
                });

                onCreated?.(newTag);
            }

            handleClose();
        } catch (error) {
            console.error(error);
            alert('创建失败');
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleClose = () => {
        setKeywords('');
        setDescription('');
        setSelectedGroup('');
        setGroupSearch('');
        setIsSubmitting(false);
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={<Text fw={700}>新建标签</Text>}
            size="90%"
            styles={{
                body: { padding: 0, height: '80vh', overflow: 'hidden' },
                content: { backgroundColor: '#141517' }
            }}
        >
            <Box style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
                <Box style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* 左侧：定义与创建区 */}
                    <Stack style={{ width: '45%', padding: 20, borderRight: '1px solid #333', overflowY: 'auto' }} gap="md">
                        <Box>
                            <Text size="xs" c="dimmed" fw={700} mb={5}>封面预览 (可粘贴图片替换)</Text>
                            <Image
                                src={cover}
                                radius="md"
                                style={{ border: '2px solid #333', aspectRatio: '16/9', objectFit: 'cover' }}
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
                            placeholder="补充标签的上下文说明..."
                            value={description}
                            onChange={(e) => setDescription(e.currentTarget.value)}
                            minRows={2}
                        />

                        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <Text size="sm" fw={500} mb={5}>归属分组 (必填)</Text>
                            <TextInput
                                placeholder="🔍 过滤或输入新分组名..."
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
                                            <Group gap="xs">
                                                <IconPlus size={14} />
                                                <Text size="sm">创建新分组 "{groupSearch}"</Text>
                                            </Group>
                                        </UnstyledButton>
                                    )}
                                    {filteredGroups.map(group => (
                                        <UnstyledButton
                                            key={group}
                                            onClick={() => {
                                                setSelectedGroup(group);
                                                setGroupSearch(group);
                                            }}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: 4,
                                                backgroundColor: selectedGroup === group ? '#333' : 'transparent',
                                                transition: 'background 0.2s'
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

                    {/* 右侧：上下文与参考区 */}
                    <Box style={{ width: '55%', display: 'flex', flexDirection: 'column', backgroundColor: '#0b0c0d' }}>
                        {/* 本视频已分配 */}
                        <Box p="md" style={{ borderBottom: '1px solid #333' }}>
                            <Text size="xs" fw={700} c="dimmed" mb="xs">本视频已分配标签 ({assignedTags.length})</Text>
                            <ScrollArea h={110}>
                                <Group gap="xs">
                                    {assignedTags.map(tag => (
                                        <Box key={tag.id} w={120}>
                                            <TagCard tag={tag} />
                                        </Box>
                                    ))}
                                    {assignedTags.length === 0 && <Text size="xs" c="dimmed" py="xl">尚未分配任何标签</Text>}
                                </Group>
                            </ScrollArea>
                        </Box>

                        {/* 标签库实时过滤 */}
                        <Box p="md" style={{ flex: 1, overflow: 'hidden' }}>
                            <Text size="xs" fw={700} c="dimmed" mb="xs">标签库参考 (实时过滤: {keywords || '无'})</Text>
                            <Box style={{ height: 'calc(100% - 25px)' }}>
                                <TagFilterGrid
                                    allTagsData={tagsData}
                                    filterKeyword={keywords}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* 底部操作栏 */}
                <Group justify="flex-end" p="md" style={{ borderTop: '1px solid #333', backgroundColor: '#141517' }}>
                    <Button variant="subtle" color="gray" onClick={handleClose} disabled={isSubmitting}>
                        取消
                    </Button>
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
        </Modal>
    );
}