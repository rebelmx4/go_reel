import { useState, useMemo } from 'react';
import { Box, Text, ScrollArea, UnstyledButton, Stack, Divider, ActionIcon, Group } from '@mantine/core';
import { IconChevronLeft, IconFilter } from '@tabler/icons-react';
import { useTagStore, useVideoFileRegistryStore, usePlaylistStore } from '../../stores';
import { TagCard } from '../../components/Tag/TagCard';
import { SidebarVideoList } from './SidebarVideoList';

export function TagFilterSidebar() {
    // --- 1. Store 数据 ---
    const { tagsData, groupConfigs, getGroupColor, getTagById } = useTagStore();
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

    const orderedGroups = useMemo(() => {
        const result: string[] = [];
        // 1. 先按配置顺序添加
        groupConfigs.forEach(cat => {
            cat.groups.forEach(g => {
                if (tagsData[g]) result.push(g);
            });
        });
        // 2. 补漏：如果 JSON 里有但配置里没写的组
        Object.keys(tagsData).forEach(g => {
            if (!result.includes(g)) result.push(g);
        });
        return result;
    }, [tagsData, groupConfigs]);

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
            {/* 左侧：分组导航 */}
            <Box style={{ width: 80, borderRight: '1px solid var(--mantine-color-dark-4)', backgroundColor: 'var(--mantine-color-dark-8)' }}>
                <ScrollArea h="100%" scrollbarSize={2}>
                    <Stack gap={0}>
                        {orderedGroups.map(group => {
                            const groupColor = getGroupColor(group); // 获取大类颜色
                            const isActive = activeGroup === group;
                            return (
                                <UnstyledButton
                                    key={group}
                                    onClick={() => setActiveGroup(group)}
                                    style={{
                                        padding: '8px 4px',
                                        backgroundColor: isActive ? 'var(--mantine-color-dark-5)' : 'transparent',
                                        borderLeft: `4px solid ${groupColor}`,
                                        transition: 'all 0.1s'
                                    }}
                                >
                                    <Text
                                        size="16px"
                                        fw={isActive ? 800 : 500}
                                        style={{
                                            color: groupColor,
                                            opacity: isActive ? 1 : 0.6,
                                            textAlign: 'center',
                                            lineHeight: 1.1
                                        }}
                                    >
                                        {group}
                                    </Text>
                                </UnstyledButton>
                            );
                        })}
                    </Stack>
                </ScrollArea>
            </Box>

            {/* 右侧：双列标签布局 (保持 Grid 布局逻辑) */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box p="xs" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
                    <Text fw={700} size="xs" c="dimmed" ta="center">SELECT TAG</Text>
                </Box>
                <Box style={{ flex: 1, minHeight: 0 }}>
                    <ScrollArea h="100%" p="xs">
                        <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {activeGroup && tagsData[activeGroup]?.map(tag => (
                                <TagCard key={tag.id} tag={tag} onClick={() => setSelectedTagId(tag.id)} />
                            ))}
                        </Box>
                    </ScrollArea>
                </Box>
            </Box>
        </Box>
    );
}