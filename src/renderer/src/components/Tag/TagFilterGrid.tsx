// src/renderer/src/player/components/TagFilterGrid.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { Box, TextInput, ScrollArea, Text, UnstyledButton, Group, Divider } from '@mantine/core';
import { IconSearch, IconFolder } from '@tabler/icons-react';
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
    const [activeGroup, setActiveGroup] = useState<string | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // 1. 根据关键词和排除列表过滤标签内容
    const filteredData = useMemo(() => {
        const result: TagsData = {};
        const lowerKeyword = filterKeyword.trim().toLowerCase();

        Object.entries(allTagsData).forEach(([group, tags]) => {
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
    }, [allTagsData, filterKeyword, excludedIds]);

    // 2. 过滤分组索引名称
    const filteredGroupNames = useMemo(() => {
        const groups = Object.keys(filteredData);
        if (!groupFilter) return groups;
        const lowerFilter = groupFilter.toLowerCase();
        return groups.filter(g => g.toLowerCase().includes(lowerFilter));
    }, [filteredData, groupFilter]);

    // 3. 滚动跳转逻辑
    const scrollToGroup = (group: string) => {
        const element = groupRefs.current.get(group);
        if (element && scrollAreaRef.current) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveGroup(group);
        }
    };

    // 4. 监听滚动以更新当前激活的分组
    useEffect(() => {
        const viewport = scrollAreaRef.current;
        if (!viewport) return;

        const handleScroll = () => {
            let currentGroup = activeGroup;
            const containerTop = viewport.getBoundingClientRect().top;

            for (const [group, el] of groupRefs.current.entries()) {
                const rect = el.getBoundingClientRect();
                if (rect.top <= containerTop + 40) {
                    currentGroup = group;
                }
            }
            if (currentGroup !== activeGroup) setActiveGroup(currentGroup);
        };

        viewport.addEventListener('scroll', handleScroll);
        return () => viewport.removeEventListener('scroll', handleScroll);
    }, [activeGroup, filteredGroupNames]);

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>

            {/* 顶部：分组导航面板 (自动宽度标签感) */}
            <Box style={{
                padding: '10px 0',
                borderBottom: '1px solid #333',
                backgroundColor: '#0b0c0d'
            }}>
                <Group justify="space-between" mb="xs" px="xs">
                    <Group gap={6}>
                        <IconFolder size={14} color="#999" />
                        <Text size="xs" fw={700} c="dimmed">分组快速索引</Text>
                    </Group>
                    <TextInput
                        placeholder="搜索分组..."
                        value={groupFilter}
                        onChange={(e) => setGroupFilter(e.currentTarget.value)}
                        size="xs"
                        leftSection={<IconSearch size={12} />}
                        styles={{
                            input: {
                                backgroundColor: '#1a1b1e',
                                border: '1px solid #373a40',
                                height: 26,
                                minHeight: 26,
                                width: 180
                            }
                        }}
                    />
                </Group>

                <ScrollArea h={60} type="hover" px="xs">
                    <Group gap="xs" pb="xs">
                        {filteredGroupNames.map(group => {
                            const isActive = activeGroup === group;
                            return (
                                <UnstyledButton
                                    key={group}
                                    onClick={() => scrollToGroup(group)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 4,
                                        backgroundColor: isActive ? 'rgba(0, 255, 0, 0.15)' : '#1a1b1e',
                                        border: `1px solid ${isActive ? '#00ff00' : '#333'}`,
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <Text size="xs" c={isActive ? '#00ff00' : 'gray.4'} fw={isActive ? 600 : 400}>
                                        {group}
                                    </Text>
                                    <Text size="10px" c="dimmed" style={{ opacity: 0.7 }}>
                                        {filteredData[group]?.length}
                                    </Text>
                                </UnstyledButton>
                            );
                        })}
                    </Group>
                </ScrollArea>
            </Box>

            {/* 下方：标签内容展示网格 */}
            <Box style={{ flex: 1, overflow: 'hidden' }}>
                <ScrollArea
                    style={{ height: '100%' }}
                    viewportRef={scrollAreaRef}
                >
                    <Box style={{ padding: '0 12px 40px 0' }}>
                        {filteredGroupNames.map(group => (
                            <Box
                                key={group}
                                ref={(el) => {
                                    if (el) groupRefs.current.set(group, el);
                                    else groupRefs.current.delete(group);
                                }}
                                style={{ marginBottom: 28 }}
                            >
                                {/* 分组标题行 - 吸顶 */}
                                <Box style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginBottom: 14,
                                    position: 'sticky',
                                    top: 0,
                                    backgroundColor: '#0b0c0d',
                                    zIndex: 5,
                                    padding: '8px 0'
                                }}>
                                    <Text size="sm" fw={800} style={{ color: '#fff', letterSpacing: 0.5 }}>
                                        {group}
                                    </Text>
                                    <Box style={{ flex: 1, height: 1, backgroundColor: '#333' }} />
                                    <Text size="xs" c="dimmed">{filteredData[group].length} 个标签</Text>
                                </Box>

                                {/* 标签卡片网格 */}
                                <Box
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                        gap: 16,
                                    }}
                                >
                                    {filteredData[group].map(tag => (
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

                        {/* 空状态 */}
                        {filteredGroupNames.length === 0 && (
                            <Box
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: 300,
                                    gap: 10
                                }}
                            >
                                <IconSearch size={40} color="#333" />
                                <Text c="dimmed" size="sm">
                                    {filterKeyword ? `未找到匹配 "${filterKeyword}" 的标签` : '库中暂无数据'}
                                </Text>
                            </Box>
                        )}
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}