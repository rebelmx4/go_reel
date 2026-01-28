// src/renderer/src/pages/TagManagePage.tsx

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Box, Grid, Stack, TextInput, Textarea, Button, Group, Text, Image, Divider, Autocomplete } from '@mantine/core';
import { notifications } from '@mantine/notifications'; // 确保导入了这个
import { useTagStore } from '../stores/tagStore';
import { TagFilterGrid } from '../components/Tag/TagFilterGrid';
import { Tag } from '../../../shared/models'; // 确保导入了这个
import { toFileUrl } from '../utils/pathUtils';

export function TagManagePage() {
    const { tagsData, updateTag, replaceTagCover, getAllGroups } = useTagStore();
    const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

    // 状态
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editGroup, setEditGroup] = useState('');
    const [isSaving, setIsSaving] = useState(false); // 之前你可能漏了这一行

    const allGroups = getAllGroups();

    const handleSelectTag = (tag: Tag) => {
        setSelectedTag(tag);
        setEditName(tag.keywords);
        setEditDesc(tag.description || '');
        const group = Object.keys(tagsData).find(g => tagsData[g].some(t => t.id === tag.id)) || '';
        setEditGroup(group);
    };

    const handleSaveInfo = async () => {
        if (!selectedTag) return;
        setIsSaving(true);
        const success = await updateTag(selectedTag.id, {
            keywords: editName,
            description: editDesc,
            group: editGroup
        });
        if (success) {
            notifications.show({ title: '更新成功', message: '标签信息已保存', color: 'green' });
        }
        setIsSaving(false);
    };

    const handlePaste = useCallback(async (event: ClipboardEvent) => {
        if (!selectedTag || isSaving) return;

        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (!file) continue;

                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64 = e.target?.result as string;
                    if (!base64) return;
                    const success = await replaceTagCover(selectedTag.id, base64);
                    if (success) {
                        notifications.show({ title: '封面已更新', message: '已从剪贴板替换图片', color: 'green' });
                    }
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    }, [selectedTag, isSaving, replaceTagCover]);

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handlePaste]);

    // 使用 useMemo 缓存左侧列表，防止输入时左侧闪烁抖动
    const memoizedGrid = useMemo(() => (
        <TagFilterGrid allTagsData={tagsData} onTagClick={handleSelectTag} />
    ), [tagsData]);

    return (
        <Box style={{ height: '100%', overflow: 'hidden' }}>
            <Grid h="100%" gutter={0}>
                <Grid.Col span={7} style={{ borderRight: '1px solid #333', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box p="md">
                        <Text fw={700}>标签库管理</Text>
                        <Text size="xs" c="dimmed">选择一个标签并使用 Ctrl+V 粘贴新封面</Text>
                    </Box>
                    <Divider />
                    <Box style={{ flex: 1, overflow: 'hidden' }}>
                        {memoizedGrid}
                    </Box>
                </Grid.Col>

                <Grid.Col span={5} bg="#111" style={{ height: '100%' }}>
                    {selectedTag ? (
                        <Stack p="xl" gap="lg">
                            <Box>
                                <Text size="xs" c="dimmed" mb={4}>当前封面 (Ctrl+V 可替换)</Text>
                                <Image src={`${toFileUrl(selectedTag.imagePath)}?t=${Date.now()}`} radius="md" fit="contain" mah={250} style={{ border: '2px solid #333', backgroundColor: '#000' }} />
                            </Box>
                            <TextInput label="名称" value={editName} onChange={(e) => setEditName(e.currentTarget.value)} />
                            <Autocomplete label="分组" data={allGroups} value={editGroup} onChange={setEditGroup} />
                            <Textarea label="描述" minRows={3} value={editDesc} onChange={(e) => setEditDesc(e.currentTarget.value)} />
                            <Group justify="flex-end">
                                <Button variant="subtle" color="gray" onClick={() => setSelectedTag(null)}>取消</Button>
                                <Button color="green" loading={isSaving} onClick={handleSaveInfo}>保存修改</Button>
                            </Group>
                        </Stack>
                    ) : (
                        <Box style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text c="dimmed">请从左侧选择一个标签</Text>
                        </Box>
                    )}
                </Grid.Col>
            </Grid>
        </Box>
    );
}