import { useState, useMemo } from 'react';
import { Box, Text, ScrollArea, UnstyledButton, Stack, Divider, ActionIcon, Group } from '@mantine/core';
import { IconChevronLeft, IconFilter } from '@tabler/icons-react';
import { useTagStore, useVideoFileRegistryStore, usePlaylistStore } from '../../stores';
import { TagCard } from '../../components/Tag/TagCard';
import { SidebarVideoList } from './SidebarVideoList';
import { Tag } from '../../../../shared/models';

export function TagFilterSidebar() {
    // --- 1. Store 数据 ---
    const { tagsData, getTagById } = useTagStore();
    const { videos, videoPaths } = useVideoFileRegistryStore();
    const jumpTo = usePlaylistStore(state => state.jumpTo);

    // --- 2. 本地状态：处理视图切换 ---
    const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
    const groups = useMemo(() => Object.keys(tagsData), [tagsData]);
    const [activeGroup, setActiveGroup] = useState<string | null>(groups[0] || null);

    // --- 3. 计算结果集 ---
    const selectedTag = useMemo(() =>
        selectedTagId ? getTagById(selectedTagId) : null,
        [selectedTagId, getTagById]);

    const filteredVideos = useMemo(() => {
        if (!selectedTagId) return [];
        // 从已排序的 videoPaths 中筛选，保证 mtime 倒序
        return videoPaths
            .map(path => videos[path])
            .filter(v => v.annotation?.tags?.includes(selectedTagId));
    }, [selectedTagId, videos, videoPaths]);

    // --- 渲染逻辑 A：视频列表视图 (全宽 300px) ---
    if (selectedTag) {
        return (
            <Box style={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--mantine-color-dark-7)' }}>
                <Box p="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
                    <Group gap="xs">
                        <ActionIcon variant="subtle" size="sm" onClick={() => setSelectedTagId(null)}>
                            <IconChevronLeft size={16} />
                        </ActionIcon>
                        <IconFilter size={14} color="var(--mantine-color-blue-5)" />
                        <Text fw={700} size="sm" truncate style={{ flex: 1 }}>
                            #{selectedTag.keywords}
                        </Text>
                    </Group>
                </Box>

                <Box style={{ flex: 1, overflow: 'hidden' }}>
                    <SidebarVideoList
                        videos={filteredVideos}
                        onPlay={(v) => jumpTo(v.path, 'tag_filter', selectedTag.id)}
                        emptyMessage="该标签下暂无关联视频"
                    />
                </Box>
            </Box>
        );
    }

    // --- 渲染逻辑 B：标签导航视图 (100px + 200px) ---
    return (
        <Box style={{ width: 300, height: '100%', display: 'flex', backgroundColor: 'var(--mantine-color-dark-7)' }}>
            {/* 左侧：分组 */}
            <Box style={{ width: 100, borderRight: '1px solid var(--mantine-color-dark-4)', backgroundColor: 'var(--mantine-color-dark-8)' }}>
                <ScrollArea h="100%" scrollbarSize={2}>
                    <Stack gap={0}>
                        {groups.map(group => (
                            <UnstyledButton
                                key={group}
                                onClick={() => setActiveGroup(group)}
                                style={{
                                    padding: '16px 8px',
                                    backgroundColor: activeGroup === group ? 'var(--mantine-color-dark-5)' : 'transparent',
                                    borderLeft: activeGroup === group ? '3px solid var(--mantine-color-blue-filled)' : '3px solid transparent'
                                }}
                            >
                                <Text size="xs" fw={activeGroup === group ? 700 : 400} c={activeGroup === group ? 'white' : 'dimmed'} ta="center">
                                    {group}
                                </Text>
                            </UnstyledButton>
                        ))}
                    </Stack>
                </ScrollArea>
            </Box>

            {/* 右侧：当前分组下的标签 */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box p="sm"><Text fw={700} size="xs" c="dimmed" ta="center">SELECT TAG</Text></Box>
                <Divider color="dark.4" />
                <Box style={{ flex: 1, minHeight: 0 }}>
                    <ScrollArea h="100%" p="md">
                        <Stack align="center" gap="lg">
                            {activeGroup && tagsData[activeGroup]?.map(tag => (
                                <TagCard
                                    key={tag.id}
                                    tag={tag}
                                    onClick={() => setSelectedTagId(tag.id)}
                                />
                            ))}
                        </Stack>
                    </ScrollArea>
                </Box>
            </Box>
        </Box>
    );
}