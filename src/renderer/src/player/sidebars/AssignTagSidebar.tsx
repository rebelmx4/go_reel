import { useState, useMemo } from 'react';
import { Box, Text, ScrollArea, UnstyledButton, Stack, Divider } from '@mantine/core';
import { useTagStore, useVideoFileRegistryStore, usePlaylistStore } from '../../stores';
import { TagCard } from '../../components/Tag/TagCard';

export function AssignTagSidebar() {
    // 1. 从 Store 获取数据
    const { tagsData } = useTagStore();
    const currentPath = usePlaylistStore((state) => state.currentPath);
    const videoFiles = useVideoFileRegistryStore((state) => state.videos);
    const updateAnnotation = useVideoFileRegistryStore((state) => state.updateAnnotation);

    // 2. 本地状态：当前选中的分组名
    const groups = useMemo(() => Object.keys(tagsData), [tagsData]);
    const [activeGroup, setActiveGroup] = useState<string | null>(groups[0] || null);

    // 3. 处理标签点击（即时生效）
    const handleTagClick = async (tagId: number) => {
        if (!currentPath) return;

        // 获取当前视频已有的标签
        const currentVideo = videoFiles[currentPath];
        const assignedTagIds = currentVideo?.annotation?.tags || [];

        // Toggle 逻辑
        let nextIds: number[];
        if (assignedTagIds.includes(tagId)) {
            nextIds = assignedTagIds.filter((id) => id !== tagId);
        } else {
            nextIds = [...assignedTagIds, tagId];
        }

        // 立即更新到 Registry（触发后端保存）
        await updateAnnotation(currentPath, { tags: nextIds });
    };

    return (
        <Box
            style={{
                width: 300,
                height: '100%',
                display: 'flex',
                backgroundColor: 'var(--mantine-color-dark-7)',
                borderLeft: '1px solid var(--mantine-color-dark-4)',
                flexShrink: 0
            }}
        >
            {/* 左侧：分组导航栏 (Group Rail) */}
            <Box
                style={{
                    width: 90,
                    height: '100%',
                    borderRight: '1px solid var(--mantine-color-dark-4)',
                    backgroundColor: 'var(--mantine-color-dark-8)'
                }}
            >
                <ScrollArea h="100%" scrollbarSize={2}>
                    <Stack gap={0}>
                        {groups.map((group) => (
                            <UnstyledButton
                                key={group}
                                onClick={() => setActiveGroup(group)}
                                style={{
                                    padding: '12px 8px',
                                    backgroundColor: activeGroup === group ? 'var(--mantine-color-dark-5)' : 'transparent',
                                    borderLeft: activeGroup === group ? '2px solid var(--mantine-color-blue-filled)' : '2px solid transparent',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                <Text
                                    size="xs"
                                    fw={activeGroup === group ? 700 : 400}
                                    c={activeGroup === group ? 'white' : 'dimmed'}
                                    ta="center"
                                    style={{
                                        wordBreak: 'break-all',
                                        lineHeight: 1.2
                                    }}
                                >
                                    {group}
                                </Text>
                            </UnstyledButton>
                        ))}
                    </Stack>
                </ScrollArea>
            </Box>

            {/* 右侧：标签列表 (Tag List) */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box p="sm">
                    <Text fw={700} size="sm" truncate>
                        {activeGroup || '选择分组'}
                    </Text>
                </Box>
                <Divider color="dark.4" />
                <Box style={{ flex: 1, minHeight: 0 }}>
                    <ScrollArea h="100%" p="sm" scrollbarSize={6}>
                        <Stack align="center" gap="md">
                            {activeGroup && tagsData[activeGroup]?.map((tag) => (
                                <TagCard
                                    key={tag.id}
                                    tag={tag}
                                    onClick={() => handleTagClick(tag.id)}
                                />
                            ))}
                            {(!activeGroup || !tagsData[activeGroup]?.length) && (
                                <Text size="xs" c="dimmed" mt="xl">该分组暂无标签</Text>
                            )}
                        </Stack>
                    </ScrollArea>
                </Box>
            </Box>
        </Box>
    );
}