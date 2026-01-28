// src/renderer/src/components/Dialog/BatchAssignTagDialog.tsx

import { useState, useEffect, useMemo } from 'react';
import { Modal, Box, Text, Button, Group, Badge, Stack } from '@mantine/core';
import { useTagStore } from '../../stores/tagStore';
import { VideoFile, Tag } from '../../../../shared/models';
import { useVideoFileRegistryStore } from '../../stores/videoFileRegistryStore';
import { TagFilterGrid } from '../Tag/TagFilterGrid';

interface BatchAssignTagDialogProps {
    opened: boolean;
    onClose: () => void;
    selectedVideos: VideoFile[];
}

export function BatchAssignTagDialog({
    opened,
    onClose,
    selectedVideos
}: BatchAssignTagDialogProps) {
    const { getTagById, tagsData } = useTagStore();
    const batchUpdateAnnotation = useVideoFileRegistryStore(s => s.batchUpdateAnnotation);

    // --- 1. 会话状态 ---
    // 存储本次操作决定“新增”的标签 ID
    const [newlySelectedIds, setNewlySelectedIds] = useState<Set<number>>(new Set());

    // 当打开时重置状态
    useEffect(() => {
        if (opened) setNewlySelectedIds(new Set());
    }, [opened]);

    // --- 2. 逻辑计算 ---

    // A. 计算共有标签 (交集)
    const commonTagIds = useMemo(() => {
        if (selectedVideos.length === 0) return [];

        // 提取每个视频的标签数组
        const allTagsArrays = selectedVideos.map(v => v.annotation?.tags || []);

        // 计算交集：从第一个数组开始，不断过滤掉不在后续数组中的 ID
        return allTagsArrays.reduce((acc, curr) =>
            acc.filter(id => curr.includes(id))
        );
    }, [selectedVideos]);

    // B. 将 ID 转换为 Tag 对象用于渲染
    const commonTags = useMemo(() =>
        commonTagIds.map(id => getTagById(id)).filter((t): t is Tag => !!t),
        [commonTagIds, getTagById]
    );

    const newlySelectedTags = useMemo(() =>
        Array.from(newlySelectedIds).map(id => getTagById(id)).filter((t): t is Tag => !!t),
        [newlySelectedIds, getTagById]
    );

    // C. 过滤掉已经在交集中的标签，避免在搜索列表中重复显示
    const excludedIds = useMemo(() =>
        new Set([...commonTagIds, ...Array.from(newlySelectedIds)]),
        [commonTagIds, newlySelectedIds]
    );

    // --- 3. 交互处理 ---

    const handleToggleNewTag = (tagId: number) => {
        setNewlySelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(tagId)) next.delete(tagId);
            else next.add(tagId);
            return next;
        });
    };

    const handleConfirm = async () => {
        const addedTagIds = Array.from(newlySelectedIds);
        if (addedTagIds.length === 0) {
            onClose();
            return;
        }

        const paths = selectedVideos.map(v => v.path);

        try {
            // 1. 调用后端批量更新接口
            const res = await window.api.updateAnnotationsBatch(paths, { tags: addedTagIds });

            if (res.success) {
                // 2. 本地 Store 乐观更新：追加标签
                batchUpdateAnnotation(paths, addedTagIds);
                onClose();
            } else {
                console.error('批量更新失败:', res.error);
            }
        } catch (error) {
            console.error('批量打标签请求异常:', error);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Stack gap={0}>
                    <Text fw={700}>批量追加标签</Text>
                    <Text size="xs" c="dimmed">已选中 {selectedVideos.length} 个视频</Text>
                </Stack>
            }
            size="xl"
            styles={{
                body: { padding: 0, height: '75vh', display: 'flex', flexDirection: 'column' },
                content: { backgroundColor: '#141517' }
            }}
        >
            {/* 共有标签展示区 (不可删除) */}
            <Box p="md" style={{ backgroundColor: '#0b0c0d', borderBottom: '1px solid #333' }}>
                <Text size="xs" fw={700} c="dimmed" mb="xs">共有标签 (不可移除)</Text>
                <Group gap="xs">
                    {commonTags.map(tag => (
                        <Badge key={tag.id} variant="filled" color="gray" size="lg" radius="sm">
                            {tag.keywords}
                        </Badge>
                    ))}
                    {commonTags.length === 0 && <Text size="xs" c="dimmed">选中视频无共同标签</Text>}
                </Group>
            </Box>

            {/* 本次追加标签区 */}
            <Box p="md" style={{ borderBottom: '1px solid #333' }}>
                <Text size="xs" fw={700} c="green.4" mb="xs">即将追加的新标签 ({newlySelectedTags.length})</Text>
                <Group gap="xs" style={{ minHeight: 32 }}>
                    {newlySelectedTags.map(tag => (
                        <Badge
                            key={tag.id}
                            variant="outline"
                            color="green"
                            size="lg"
                            radius="sm"
                            onClick={() => handleToggleNewTag(tag.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            {tag.keywords} ✕
                        </Badge>
                    ))}
                </Group>
            </Box>

            {/* 标签库搜索选择区 */}
            <Box style={{ flex: 1, overflow: 'hidden' }}>
                <TagFilterGrid
                    allTagsData={tagsData}
                    excludedIds={excludedIds}
                    onTagClick={(tag) => handleToggleNewTag(tag.id)}
                />
            </Box>

            {/* 底部操作栏 */}
            <Group justify="flex-end" p="md" style={{ borderTop: '1px solid #333', backgroundColor: '#141517' }}>
                <Button variant="subtle" color="gray" onClick={onClose}>
                    取消
                </Button>
                <Button
                    color="green"
                    onClick={handleConfirm}
                    disabled={newlySelectedIds.size === 0}
                >
                    确认追加到 {selectedVideos.length} 个视频
                </Button>
            </Group>
        </Modal>
    );
}