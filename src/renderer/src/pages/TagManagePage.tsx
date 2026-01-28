import { useState, useMemo, useCallback, useEffect } from 'react';
import { Box, Grid, Stack, TextInput, Textarea, Button, Group, Text, Image, Autocomplete, ScrollArea } from '@mantine/core';
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

    // 选中标签时回填表单
    const handleSelectTag = useCallback((tag: Tag) => {
        setSelectedTag(tag);
        setEditName(tag.keywords);
        setEditDesc(tag.description || '');
        const group = Object.keys(tagsData).find(g => tagsData[g].some(t => t.id === tag.id)) || '';
        setEditGroup(group);
    }, [tagsData]);

    // 保存信息逻辑
    const handleSaveInfo = async () => {
        if (!selectedTag) return;
        setIsSaving(true);
        try {
            const success = await updateTag(selectedTag.id, {
                keywords: editName,
                description: editDesc,
                group: editGroup
            });
            if (success) {
                notifications.show({ title: '更新成功', message: '标签信息已保存', color: 'green' });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    // 粘贴图片替换封面逻辑
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

    // 缓存 Grid 组件，避免不必要的重绘
    const memoizedGrid = useMemo(() => (
        <TagFilterGrid allTagsData={tagsData} onTagClick={handleSelectTag} />
    ), [tagsData, handleSelectTag]);

    return (
        <Box p="xl" style={{
            height: '100vh',
            boxSizing: 'border-box',
            overflow: 'hidden',
            display: 'flex',      // 关键：变成 Flex 容器
            flexDirection: 'column'
        }}>
            <Grid
                gutter="xl"
                style={{
                    flex: 1,      // 关键：占据剩余空间
                    minHeight: 0, // 关键：允许 flex 子元素收缩，否则会被 ScrollArea 撑开
                    width: '100%',
                    margin: 0
                }}
                styles={{
                    // 关键：强制 Grid 内部容器高度为 100%，否则高度链会断裂
                    inner: { height: '100%', margin: 0, width: '100%' }
                }}
            >
                {/* 左侧区域：标签列表 */}
                <Grid.Col span={7} style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0
                }}>
                    {/* 包裹层：确保 TagFilterGrid 拿到 100% 高度 */}
                    <Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        {memoizedGrid}
                    </Box>
                </Grid.Col>

                {/* 右侧区域：编辑表单 */}
                <Grid.Col span={5} style={{ height: '100%', minHeight: 0 }}>
                    {selectedTag ? (
                        <Box
                            bg="#111"
                            style={{
                                height: '100%',
                                borderRadius: '12px',
                                border: '1px solid #333',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden' // 防止容器整体滚动
                            }}
                        >
                            {/* 表单内容区：使用 ScrollArea 或 overflow-y: auto */}
                            <Box style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
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
                                            style={{ border: '2px solid #333', backgroundColor: '#000', minHeight: 150 }}
                                        />
                                    </Box>
                                    <TextInput
                                        label="标签名称"
                                        value={editName}
                                        onChange={(e) => setEditName(e.currentTarget.value)}
                                    />
                                    <Autocomplete
                                        label="所属分组"
                                        data={allGroups}
                                        value={editGroup}
                                        onChange={setEditGroup}
                                    />
                                    <Textarea
                                        label="标签描述"
                                        minRows={4}
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.currentTarget.value)}
                                    />
                                </Stack>
                            </Box>

                            {/* 底部按钮区：固定在底部 */}
                            <Box style={{
                                padding: '16px 24px',
                                borderTop: '1px solid #222',
                                backgroundColor: '#141414'
                            }}>
                                <Group justify="flex-end">
                                    <Button variant="subtle" color="gray" onClick={() => setSelectedTag(null)}>
                                        取消选择
                                    </Button>
                                    <Button color="green" loading={isSaving} onClick={handleSaveInfo} px="xl">
                                        保存修改
                                    </Button>
                                </Group>
                            </Box>
                        </Box>
                    ) : (
                        <Box
                            style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px dashed #333',
                                borderRadius: '12px',
                                backgroundColor: '#111'
                            }}
                        >
                            <Stack align="center" gap="xs">
                                <Text size="lg" fw={500} c="gray.4">未选择标签</Text>
                                <Text c="dimmed" size="sm">请从左侧列表点击一个标签进行编辑</Text>
                            </Stack>
                        </Box>
                    )}
                </Grid.Col>
            </Grid>
        </Box>
    );
}