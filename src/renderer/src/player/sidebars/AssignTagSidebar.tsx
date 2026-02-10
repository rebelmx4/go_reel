import { useState, useMemo, useEffect } from 'react';
import { Box, Text, ScrollArea, UnstyledButton, Stack, Divider } from '@mantine/core';
import { useTagStore, useVideoFileRegistryStore, usePlaylistStore } from '../../stores';
import { TagCard } from '../../components/Tag/TagCard';

export function AssignTagSidebar() {
    // 1. 从 Store 获取数据
    const { tagsData, groupConfigs, getGroupColor } = useTagStore();
    const currentPath = usePlaylistStore((state) => state.currentPath);
    const videoFiles = useVideoFileRegistryStore((state) => state.videos);
    const updateAnnotation = useVideoFileRegistryStore((state) => state.updateAnnotation);

    // 2. 本地状态：当前选中的分组名
    const groups = useMemo(() => Object.keys(tagsData), [tagsData]);

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

    const orderedGroups = useMemo(() => {
        const result: string[] = [];
        // 先按配置中的 category 和 groups 顺序排列
        groupConfigs.forEach(cat => {
            cat.groups.forEach(g => {
                if (tagsData[g]) result.push(g);
            });
        });
        // 补漏：如果在 JSON 里有但没写在配置里的组，排在后面
        Object.keys(tagsData).forEach(g => {
            if (!result.includes(g)) result.push(g);
        });
        return result;
    }, [tagsData, groupConfigs]);

    // 3. 修改初始状态：默认选中有序列表的第一个
    const [activeGroup, setActiveGroup] = useState<string | null>(orderedGroups[0] || null);

    // 自动纠正 activeGroup
    useEffect(() => {
        if (orderedGroups.length > 0 && (!activeGroup || !orderedGroups.includes(activeGroup))) {
            setActiveGroup(orderedGroups[0]);
        }
    }, [orderedGroups]);

    // 获取当前视频已分配的标签 ID（用于在 Card 上显示选中状态）
    const currentAssignedIds = useMemo(() => {
        return videoFiles[currentPath || '']?.annotation?.tags || [];
    }, [videoFiles, currentPath]);

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
                    width: 80, // 稍微缩窄一点
                    height: '100%',
                    borderRight: '1px solid var(--mantine-color-dark-4)',
                    backgroundColor: 'var(--mantine-color-dark-8)'
                }}
            >
                <ScrollArea h="100%" scrollbarSize={2}>
                    {/* 在 Stack 内部修改 map 逻辑 */}
                    <Stack gap={0}>
                        {orderedGroups.map((group, index) => {
                            const groupColor = getGroupColor(group);
                            const isActive = activeGroup === group;

                            // --- 新增逻辑：判断颜色是否变化 ---
                            const prevGroup = orderedGroups[index - 1];
                            const isColorChanged = index > 0 && getGroupColor(prevGroup) !== groupColor;

                            return (
                                <Box key={group}>
                                    {/* 如果颜色发生变化，插入一条分割线 */}
                                    {isColorChanged && <Divider my={4} color="var(--mantine-color-dark-4)" style={{ opacity: 0.5 }} />}

                                    <UnstyledButton
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
                                </Box>
                            );
                        })}
                    </Stack>
                </ScrollArea>
            </Box>

            {/* 右侧：标签列表 (Tag List) */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box p="xs" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
                    <Text fw={700} size="xs" truncate ta="center">
                        {activeGroup || 'SELECT'}
                    </Text>
                </Box>
                <Box style={{ flex: 1, minHeight: 0 }}>
                    <ScrollArea h="100%" p="xs" scrollbarSize={6}>
                        {/* 改为双列网格布局 */}
                        <Box style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '8px'
                        }}>
                            {activeGroup && tagsData[activeGroup]?.map((tag) => (
                                <TagCard
                                    key={tag.id}
                                    tag={tag}
                                    // 可以在这里给 tagcard 传参，让已选中的标签变亮或加边框
                                    dimmed={currentAssignedIds.includes(tag.id)}
                                    onClick={() => handleTagClick(tag.id)}
                                />
                            ))}
                        </Box>
                        {(!activeGroup || !tagsData[activeGroup]?.length) && (
                            <Text size="xs" c="dimmed" mt="xl" ta="center">空</Text>
                        )}
                    </ScrollArea>
                </Box>
            </Box>
        </Box>
    );
}