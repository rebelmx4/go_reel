import { useState, useMemo } from 'react';
import { Box, TextInput, ScrollArea, Text, UnstyledButton, Group } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { TagsData } from '../../stores/tagStore';
import { TagCard } from './TagCard';
import { Tag } from '../../../../shared/models';

interface TagFilterGridProps {
    allTagsData: TagsData;
    filterKeyword?: string;
    excludedIds?: Set<number>;
    onTagClick?: (tag: Tag) => void;
    draggable?: boolean;
    onTagDragStart?: (tag: Tag) => void;
}

export function TagFilterGrid({
    allTagsData,
    filterKeyword = '',
    excludedIds = new Set(),
    onTagClick,
    draggable = false,
    onTagDragStart
}: TagFilterGridProps) {
    const [groupFilter, setGroupFilter] = useState('');
    const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);

    // 1. 处理标签筛选逻辑
    const filteredData = useMemo(() => {
        const result: TagsData = {};
        const lowerKeyword = filterKeyword.trim().toLowerCase();

        Object.entries(allTagsData).forEach(([group, tags]) => {
            if (selectedGroupName && group !== selectedGroupName) return;

            const filteredTags = tags.filter(tag => {
                if (excludedIds.has(tag.id)) return false;
                if (!lowerKeyword) return true;
                return (
                    tag.keywords.toLowerCase().includes(lowerKeyword) ||
                    tag.description?.toLowerCase().includes(lowerKeyword)
                );
            });

            if (filteredTags.length > 0) result[group] = filteredTags;
        });
        return result;
    }, [allTagsData, filterKeyword, excludedIds, selectedGroupName]);

    // 2. 顶部显示的“分组按钮列表”
    const availableGroups = useMemo(() => {
        const groups = Object.keys(allTagsData);
        if (!groupFilter) return groups;
        const lowerFilter = groupFilter.toLowerCase();
        return groups.filter(g => g.toLowerCase().includes(lowerFilter));
    }, [allTagsData, groupFilter]);

    const handleGroupClick = (group: string) => {
        setSelectedGroupName(prev => prev === group ? null : group);
    };

    return (
        <Box style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            overflow: 'hidden'
        }}>
            {/* 顶部固定区：flex-shrink: 0 保证它不被压缩 */}
            <Box style={{
                flexShrink: 0,
                paddingBottom: 16,
                borderBottom: '1px solid #222',
                marginBottom: 12
            }}>
                <Group gap="xs" align="flex-start">
                    <TextInput
                        placeholder="搜索分组..."
                        value={groupFilter}
                        onChange={(e) => setGroupFilter(e.currentTarget.value)}
                        size="xs"
                        leftSection={<IconSearch size={14} />}
                        styles={{
                            input: {
                                backgroundColor: '#1a1b1e',
                                border: '1px solid #373a40',
                                width: 140,
                                height: 30
                            }
                        }}
                    />

                    <Box style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                        <UnstyledButton
                            onClick={() => setSelectedGroupName(null)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: 4,
                                backgroundColor: selectedGroupName === null ? 'rgba(0, 255, 0, 0.15)' : 'transparent',
                                border: `1px solid ${selectedGroupName === null ? '#00ff00' : '#333'}`,
                                height: 30
                            }}
                        >
                            <Text size="xs" c={selectedGroupName === null ? '#00ff00' : 'gray.5'} fw={selectedGroupName === null ? 700 : 400}>
                                全部
                            </Text>
                        </UnstyledButton>

                        {availableGroups.map(group => {
                            const isActive = selectedGroupName === group;
                            return (
                                <UnstyledButton
                                    key={group}
                                    onClick={() => handleGroupClick(group)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 4,
                                        backgroundColor: isActive ? 'rgba(0, 255, 0, 0.15)' : 'transparent',
                                        border: `1px solid ${isActive ? '#00ff00' : '#333'}`,
                                        transition: 'all 0.1s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        height: 30
                                    }}
                                >
                                    <Text size="xs" c={isActive ? '#00ff00' : 'gray.5'} fw={isActive ? 700 : 400}>
                                        {group}
                                    </Text>
                                    <Text size="10px" c="dimmed" style={{ opacity: 0.5 }}>
                                        {allTagsData[group]?.length}
                                    </Text>
                                </UnstyledButton>
                            );
                        })}
                    </Box>
                </Group>
            </Box>

            {/* 下方标签滚动区：flex: 1 占据剩余空间 */}
            <Box style={{ flex: 1, minHeight: 0 }}>
                <ScrollArea
                    h="100%"
                    scrollbarSize={8}
                    type="hover"
                >
                    <Box style={{ paddingRight: 16 }}>
                        {Object.entries(filteredData).map(([group, tags]) => (
                            <Box key={group} style={{ marginBottom: 24 }}>
                                <Box style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 10,
                                    padding: '4px 0'
                                }}>
                                    <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: 1 }}>
                                        {group.toUpperCase()}
                                    </Text>
                                    <Box style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
                                </Box>

                                <Box
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                        gap: 12,
                                    }}
                                >
                                    {tags.map(tag => (
                                        <TagCard
                                            key={tag.id}
                                            tag={tag}
                                            onClick={onTagClick}
                                            draggable={draggable}
                                            onDragStart={onTagDragStart}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        ))}

                        {Object.keys(filteredData).length === 0 && (
                            <Box style={{ textAlign: 'center', paddingTop: 60 }}>
                                <Text c="dimmed">无匹配标签</Text>
                            </Box>
                        )}
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}