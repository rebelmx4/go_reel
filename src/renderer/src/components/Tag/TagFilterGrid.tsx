import { useState, useMemo, useRef, useEffect } from 'react';
import { Box, TextInput, ScrollArea, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { Tag, TagsData } from '../../stores';
import { TagCard } from './TagCard';

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

    // Filter tags based on keyword and excluded IDs
    const filteredData = useMemo(() => {
        const result: TagsData = {};
        const lowerKeyword = filterKeyword.toLowerCase();

        Object.entries(allTagsData).forEach(([group, tags]) => {
            const filteredTags = tags.filter(tag => {
                // Exclude if in excluded IDs
                if (excludedIds.has(tag.id)) return false;

                // Filter by keyword
                if (lowerKeyword) {
                    const matchKeywords = tag.keywords.toLowerCase().includes(lowerKeyword);
                    const matchDescription = tag.description?.toLowerCase().includes(lowerKeyword);
                    if (!matchKeywords && !matchDescription) return false;
                }

                return true;
            });

            if (filteredTags.length > 0) {
                result[group] = filteredTags;
            }
        });

        return result;
    }, [allTagsData, filterKeyword, excludedIds]);

    // Filter groups based on group filter
    const filteredGroups = useMemo(() => {
        const groups = Object.keys(filteredData);
        if (!groupFilter) return groups;

        const lowerFilter = groupFilter.toLowerCase();
        return groups.filter(g => g.toLowerCase().includes(lowerFilter));
    }, [filteredData, groupFilter]);

    // Scroll to group when clicked
    const scrollToGroup = (group: string) => {
        const element = groupRefs.current.get(group);
        if (element && scrollAreaRef.current) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveGroup(group);
        }
    };

    // Detect active group on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (!scrollAreaRef.current) return;

            let currentGroup: string | null = null;

            groupRefs.current.forEach((element, group) => {
                const rect = element.getBoundingClientRect();
                const containerRect = scrollAreaRef.current!.getBoundingClientRect();

                if (rect.top <= containerRect.top + 100) {
                    currentGroup = group;
                }
            });

            if (currentGroup) {
                setActiveGroup(currentGroup);
            }
        };

        const scrollArea = scrollAreaRef.current;
        if (scrollArea) {
            scrollArea.addEventListener('scroll', handleScroll);
            return () => scrollArea.removeEventListener('scroll', handleScroll);
        }

        return undefined;
    }, [filteredGroups]);

    return (
        <Box style={{ display: 'flex', height: '100%', gap: 10 }}>
            {/* Left: Group Navigation */}
            <Box style={{ width: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Text size="sm" fw={600} c="dimmed">📂 标签分组</Text>

                <TextInput
                    placeholder="🔍 过滤分组..."
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.currentTarget.value)}
                    size="xs"
                    leftSection={<IconSearch size={14} />}
                />

                <ScrollArea style={{ flex: 1 }}>
                    <Box style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {filteredGroups.map(group => (
                            <Box
                                key={group}
                                onClick={() => scrollToGroup(group)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    backgroundColor: activeGroup === group ? '#2a2a2a' : 'transparent',
                                    color: activeGroup === group ? '#00ff00' : '#ddd',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (activeGroup !== group) {
                                        e.currentTarget.style.backgroundColor = '#1a1a1a';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (activeGroup !== group) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                {group} ({filteredData[group]?.length || 0})
                            </Box>
                        ))}
                    </Box>
                </ScrollArea>
            </Box>

            {/* Right: Tag Grid */}
            <Box style={{ flex: 1, overflow: 'hidden' }}>
                <ScrollArea
                    style={{ height: '100%' }}
                    viewportRef={scrollAreaRef}
                >
                    <Box style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {filteredGroups.map(group => (
                            <Box
                                key={group}
                                ref={(el) => {
                                    if (el) groupRefs.current.set(group, el);
                                }}
                            >
                                {/* Group Title */}
                                <Text
                                    size="lg"
                                    fw={600}
                                    style={{
                                        marginBottom: 12,
                                        paddingBottom: 8,
                                        borderBottom: '2px solid #444',
                                    }}
                                >
                                    {group}
                                </Text>

                                {/* Tag Grid */}
                                <Box
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                        gap: 12,
                                    }}
                                >
                                    {filteredData[group]?.map(tag => (
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

                        {filteredGroups.length === 0 && (
                            <Box
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: 200,
                                    color: 'var(--mantine-color-dimmed)',
                                }}
                            >
                                <Text>没有找到匹配的标签</Text>
                            </Box>
                        )}
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
