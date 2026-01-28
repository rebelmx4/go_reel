// src/renderer/src/pages/TagManagePage.tsx

import { useState, useMemo } from 'react';
import { Box, Grid, Paper, Stack, TextInput, Textarea, Button, Group, Text, Image, Divider, Autocomplete } from '@mantine/core';
import { useTagStore } from '../stores/tagStore';
import { TagFilterGrid } from '../components/Tag/TagFilterGrid';
import { Tag } from '../../../shared/models';
import { toFileUrl } from '../utils/pathUtils';
import { notifications } from '@mantine/notifications';

export function TagManagePage() {
    const { tagsData, updateTag, replaceTagCover, getAllGroups } = useTagStore();
    const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

    // 编辑表单状态
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editGroup, setEditGroup] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const allGroups = getAllGroups();

    const handleSelectTag = (tag: Tag) => {
        setSelectedTag(tag);
        setEditName(tag.keywords);
        setEditDesc(tag.description || '');
        // 查找所属分组
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

    const handleUpdateCover = async () => {
        if (!selectedTag) return;
        // 这里可以使用已有的截图/粘贴逻辑，或者触发文件选择
        // 简单演示：这里假设你已经有了一个获取 Base64 的方式
        // const base64 = await ...
        // await replaceTagCover(selectedTag.id, base64);
    };

    return (
        <Box style={{ height: '100%', overflow: 'hidden' }}>
            <Grid h="100%" gutter={0}>
                {/* 左侧：标签选择库 */}
                <Grid.Col span={7} style={{ borderRight: '1px solid #333', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box p="md">
                        <Text fw={700}>标签库管理</Text>
                        <Text size="xs" c="dimmed">选择一个标签进行编辑</Text>
                    </Box>
                    <Divider />
                    <Box style={{ flex: 1, overflow: 'hidden' }}>
                        <TagFilterGrid
                            allTagsData={tagsData}
                            onTagClick={handleSelectTag}
                        />
                    </Box>
                </Grid.Col>

                {/* 右侧：编辑表单 */}
                <Grid.Col span={5} bg="#111" style={{ height: '100%' }}>
                    {selectedTag ? (
                        <Stack p="xl" gap="lg">
                            <Text fw={700} size="lg">编辑标签: ID {selectedTag.id}</Text>

                            <Box>
                                <Text size="xs" c="dimmed" mb={4}>标签封面</Text>
                                <Image
                                    src={toFileUrl(selectedTag.imagePath)}
                                    radius="md"
                                    fit="contain"
                                    mah={200}
                                    style={{ border: '2px solid #333', backgroundColor: '#000' }}
                                />
                                <Button size="xs" variant="subtle" mt="xs" onClick={() => alert('请在播放器截图并点击“创建标签”来替换，或通过粘贴实现。')}>
                                    替换图片 (粘贴 Ctrl+V 可实现)
                                </Button>
                            </Box>

                            <TextInput
                                label="标签名称 (Keywords)"
                                value={editName}
                                onChange={(e) => setEditName(e.currentTarget.value)}
                            />

                            <Autocomplete
                                label="所属分组"
                                placeholder="选择或输入新分组"
                                data={allGroups}
                                value={editGroup}
                                onChange={setEditGroup}
                            />

                            <Textarea
                                label="描述信息"
                                minRows={3}
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.currentTarget.value)}
                            />

                            <Divider mt="xl" />

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