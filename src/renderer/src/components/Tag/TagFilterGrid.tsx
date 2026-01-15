import { useState, useMemo, useRef, useEffect } from 'react';
import { Box, TextInput, ScrollArea, Text, UnstyledButton } from '@mantine/core';
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

    // 1. 根据关键词和排除列表过滤标签
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

            if (filteredTags.length > 0) {
                result[group] = filteredTags;
            }
        });

        return result;
    }, [allTagsData, filterKeyword, excludedIds]);

    // 2. 过滤左侧分组列表
    const filteredGroupNames = useMemo(() => {
        const groups = Object.keys(filteredData);
        if (!groupFilter) return groups;

        const lowerFilter = groupFilter.toLowerCase();
        return groups.filter(g => g.toLowerCase().includes(lowerFilter));
    }, [filteredData, groupFilter]);

    const scrollToGroup = (group: string) => {
        const element = groupRefs.current.get(group);
        if (element && scrollAreaRef.current) {
            // 使用 scrollIntoView 或直接计算 scrollTop
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveGroup(group);
        }
    };

    // 监听滚动以更新当前激活的分组（左侧高亮）
    useEffect(() => {
        const viewport = scrollAreaRef.current;
        if (!viewport) return;

        const handleScroll = () => {
            let currentGroup = activeGroup;
            const containerTop = viewport.getBoundingClientRect().top;

            for (const [group, el] of groupRefs.current.entries()) {
                const rect = el.getBoundingClientRect();
                // 只要分组标题到达顶部附近，就切换激活状态
                if (rect.top <= containerTop + 20) {
                    currentGroup = group;
                }
            }
            if (currentGroup !== activeGroup) setActiveGroup(currentGroup);
        };

        viewport.addEventListener('scroll', handleScroll);
        return () => viewport.removeEventListener('scroll', handleScroll);
    }, [activeGroup, filteredGroupNames]);

    return (
        <Box style={{ display: 'flex', height: '100%', gap: 12, overflow: 'hidden' }}>
            {/* 左侧：分组导航面板 */}
            <Box style={{
                width: 180,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                borderRight: '1px solid #333',
                paddingRight: 8
            }}>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                    <IconFolder size={16} color="#999" />
                    <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: 0.5 }}>分组索引</Text>
                </Box>

                <TextInput
                    placeholder="过滤分组..."
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.currentTarget.value)}
                    size="xs"
                    leftSection={<IconSearch size={12} />}
                    styles={{ input: { backgroundColor: '#1a1b1e', border: '1px solid #373a40' } }}
                />

                <ScrollArea style={{ flex: 1 }}>
                    <Box style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {filteredGroupNames.map(group => (
                            <UnstyledButton
                                key={group}
                                onClick={() => scrollToGroup(group)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: 4,
                                    fontSize: '12px',
                                    backgroundColor: activeGroup === group ? 'rgba(0, 255, 0, 0.1)' : 'transparent',
                                    color: activeGroup === group ? '#00ff00' : '#c1c2c5',
                                    transition: 'background-color 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <Text size="xs" truncate style={{ maxWidth: 120 }}>{group}</Text>
                                <Text size="10px" c="dimmed">[{filteredData[group]?.length}]</Text>
                            </UnstyledButton>
                        ))}
                    </Box>
                </ScrollArea>
            </Box>

            {/* 右侧：标签展示网格 */}
            <Box style={{ flex: 1, overflow: 'hidden' }}>
                <ScrollArea
                    style={{ height: '100%' }}
                    viewportRef={scrollAreaRef}
                >
                    <Box style={{ paddingRight: 12, paddingBottom: 40 }}>
                        {filteredGroupNames.map(group => (
                            <Box
                                key={group}
                                ref={(el) => {
                                    if (el) groupRefs.current.set(group, el);
                                    else groupRefs.current.delete(group);
                                }}
                                style={{ marginBottom: 24 }}
                            >
                                {/* 分组标题行 */}
                                <Box style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    marginBottom: 12,
                                    position: 'sticky',
                                    top: 0,
                                    backgroundColor: '#141517', // 与背景色一致，制造遮盖效果
                                    zIndex: 5,
                                    padding: '4px 0'
                                }}>
                                    <Text size="sm" fw={700} style={{ color: '#eee' }}>{group}</Text>
                                    <Box style={{ flex: 1, height: 1, backgroundColor: '#333' }} />
                                </Box>

                                {/* 标签卡片网格 */}
                                <Box
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                        gap: 12,
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

                        {/* 空状态显示 */}
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
                                    {filterKeyword ? `未找到包含 "${filterKeyword}" 的标签` : '标签库为空'}
                                </Text>
                            </Box>
                        )}
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}