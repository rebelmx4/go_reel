import { useState, useMemo } from 'react';
import { Box, TextInput, Text, CloseButton, ScrollArea, Badge, Group, Stack, Divider, Title } from '@mantine/core';
import { IconSearch, IconVideoOff, IconFilter, IconHash } from '@tabler/icons-react';
import { useTagStore, useVideoFileRegistryStore, usePlaylistStore, useNavigationStore } from '../stores';
import { TagFilterGrid } from '../components/Tag/TagFilterGrid';
import { VideoFile } from '../../../shared/models';
import { VideoGrid } from '../components/Video/VideoGrid';

export function TagSearchPage() {
    const [filterKeyword, setFilterKeyword] = useState('');

    // Store 数据订阅
    const tagsData = useTagStore((state) => state.tagsData);
    const selectedTags = useTagStore((state) => state.selectedTags);
    const addSelectedTag = useTagStore((state) => state.addSelectedTag);
    const removeSelectedTag = useTagStore((state) => state.removeSelectedTag);
    const clearSelectedTags = useTagStore((state) => state.clearSelectedTags || (() => { })); // 假设有清空功能

    const videos = useVideoFileRegistryStore((state) => state.videos);
    const updateAnnotation = useVideoFileRegistryStore((state) => state.updateAnnotation);

    const setCurrentPath = usePlaylistStore((state) => state.setCurrentPath);
    const setView = useNavigationStore((state) => state.setView);

    // 搜索核心逻辑 (交集计算)
    const searchResults = useMemo(() => {
        if (selectedTags.length === 0) return [];
        const selectedTagIds = selectedTags.map(t => t.id);
        const allVideos = Object.values(videos);

        return allVideos.filter(video => {
            const videoTags = video.annotation?.tags || [];
            return selectedTagIds.every(id => videoTags.includes(id));
        });
    }, [selectedTags, videos]);

    const excludedIds = useMemo(() => new Set(selectedTags.map(t => t.id)), [selectedTags]);

    const handlePlay = (video: VideoFile) => {
        setCurrentPath(video.path);
        setView('player_page');
    };

    return (
        <Box style={{ display: 'flex', height: '100%', backgroundColor: '#141517', color: '#C1C2C5' }}>

            {/* 左侧：筛选面板 (固定宽度) */}
            <Box style={{
                width: 320,
                borderRight: '1px solid #2C2E33',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#1A1B1E'
            }}>
                {/* 侧边栏头部 */}
                <Box p="md">
                    <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                            <IconFilter size={18} color="#40C057" />
                            <Text fw={700} size="sm">筛选器</Text>
                        </Group>
                        {selectedTags.length > 0 && (
                            <Text
                                size="xs"
                                c="dimmed"
                                style={{ cursor: 'pointer' }}
                                onClick={() => selectedTags.forEach(t => removeSelectedTag(t.id))}
                            >
                                清除全部
                            </Text>
                        )}
                    </Group>

                    <TextInput
                        placeholder="搜索标签..."
                        value={filterKeyword}
                        onChange={(e) => setFilterKeyword(e.currentTarget.value)}
                        leftSection={<IconSearch size={14} />}
                        size="xs"
                        styles={{ input: { backgroundColor: '#25262B', borderColor: '#373A40' } }}
                    />
                </Box>

                <Divider color="#2C2E33" />

                {/* 已选标签展示区 */}
                <Box p="xs" style={{ minHeight: selectedTags.length > 0 ? 80 : 0 }}>
                    <Group gap={6}>
                        {selectedTags.map(tag => (
                            <Badge
                                key={tag.id}
                                variant="filled"
                                color="green.8"
                                size="sm"
                                rightSection={
                                    <CloseButton
                                        size={12}
                                        onClick={() => removeSelectedTag(tag.id)}
                                        styles={{ root: { color: 'white' } }}
                                    />
                                }
                                styles={{ root: { textTransform: 'none', paddingRight: 3 } }}
                            >
                                {tag.keywords}
                            </Badge>
                        ))}
                    </Group>
                </Box>

                {/* 标签选择网格 (滚动区) */}
                <Box style={{ flex: 1, overflow: 'hidden' }}>
                    <ScrollArea h="100%" p="md" offsetScrollbars>
                        <TagFilterGrid
                            allTagsData={tagsData}
                            filterKeyword={filterKeyword}
                            excludedIds={excludedIds}
                            onTagClick={(tag) => addSelectedTag(tag)}
                        />
                    </ScrollArea>
                </Box>
            </Box>

            {/* 右侧：结果展示区 (自适应宽度) */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <ScrollArea style={{ flex: 1 }} p="xl">
                    <Box style={{ maxWidth: 1200, margin: '0 auto' }}>
                        {selectedTags.length === 0 ? (
                            <Stack align="center" gap="xs" mt={100} style={{ opacity: 0.5 }}>
                                <IconHash size={64} stroke={1} />
                                <Title order={3}>开始搜索</Title>
                                <Text size="sm">请在左侧面板选择标签来筛选视频</Text>
                            </Stack>
                        ) : searchResults.length === 0 ? (
                            <Stack align="center" gap="xs" mt={100}>
                                <IconVideoOff size={48} color="#5C5F66" />
                                <Text c="dimmed">未找到同时满足以下条件的视频</Text>
                                <Group gap={4}>
                                    {selectedTags.map(t => (
                                        <Text key={t.id} size="sm" fw={700} c="green.4">#{t.keywords}</Text>
                                    ))}
                                </Group>
                            </Stack>
                        ) : (
                            <Box>
                                <Group justify="space-between" mb="xl" align="flex-end">
                                    <Stack gap={2}>
                                        <Title order={4}>匹配结果</Title>
                                        <Text size="xs" c="dimmed">共找到 {searchResults.length} 个视频档案</Text>
                                    </Stack>
                                </Group>

                                <VideoGrid
                                    videos={searchResults}
                                    onPlay={handlePlay}
                                    onToggleLike={(v) => updateAnnotation(v.path, { like_count: (v.annotation?.like_count ?? 0) > 0 ? 0 : 1 })}
                                    onToggleElite={(v) => updateAnnotation(v.path, { is_favorite: !v.annotation?.is_favorite })}
                                    emptyMessage=""
                                />
                            </Box>
                        )}
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}