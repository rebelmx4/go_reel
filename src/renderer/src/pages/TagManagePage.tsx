import { useState, useMemo, useCallback, useEffect } from 'react';
import { Box, Grid, Stack, TextInput, Textarea, Button, Group, Text, Image, Autocomplete } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTagStore } from '../stores/tagStore';
import { TagFilterGrid } from '../components/Tag/TagFilterGrid';
import { Tag } from '../../../shared/models';
import { toFileUrl } from '../utils/pathUtils';

export function TagManagePage() {
    const { tagsData, updateTag, replaceTagCover, getAllGroups } = useTagStore();
    const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editGroup, setEditGroup] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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

    const memoizedGrid = useMemo(() => (
        <TagFilterGrid allTagsData={tagsData} onTagClick={handleSelectTag} />
    ), [tagsData]);

    return (
        // 增加外层边距 p="xl"
        <Box p="xl" style={{ height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
            <Grid h="100%" gutter="xl">
                {/* 左侧区域 */}
                <Grid.Col span={7} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Box style={{ flex: 1, overflow: 'hidden' }}>
                        {memoizedGrid}
                    </Box>
                </Grid.Col>

                {/* 右侧编辑区域 */}
                <Grid.Col span={5} style={{ height: '100%' }}>
                    {selectedTag ? (
                        <Box
                            bg="#111"
                            p="xl"
                            style={{
                                height: '100%',
                                borderRadius: '12px',
                                border: '1px solid #333',
                                overflowY: 'auto'
                            }}
                        >
                            <Stack gap="lg">
                                <Box>
                                    <Text size="xs" c="dimmed" mb={8} fw={700} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                        标签封面 (Ctrl+V 替换)
                                    </Text>
                                    <Image
                                        src={`${toFileUrl(selectedTag.imagePath)}?t=${Date.now()}`}
                                        radius="md"
                                        fit="contain"
                                        mah={300}
                                        style={{ border: '2px solid #333', backgroundColor: '#000' }}
                                    />
                                </Box>
                                <TextInput label="标签名称" value={editName} onChange={(e) => setEditName(e.currentTarget.value)} />
                                <Autocomplete label="所属分组" data={allGroups} value={editGroup} onChange={setEditGroup} />
                                <Textarea label="标签描述" minRows={4} value={editDesc} onChange={(e) => setEditDesc(e.currentTarget.value)} />
                                <Group justify="flex-end" mt="md">
                                    <Button variant="subtle" color="gray" onClick={() => setSelectedTag(null)}>取消选择</Button>
                                    <Button color="green" loading={isSaving} onClick={handleSaveInfo} px="xl">保存修改</Button>
                                </Group>
                            </Stack>
                        </Box>
                    ) : (
                        <Box
                            style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px dashed #333',
                                borderRadius: '12px'
                            }}
                        >
                            <Text c="dimmed">请从左侧列表选择一个标签进行编辑</Text>
                        </Box>
                    )}
                </Grid.Col>
            </Grid>
        </Box>
    );
}