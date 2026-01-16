import { useState, useMemo } from 'react';
import { Box, TextInput, Text, CloseButton, ScrollArea } from '@mantine/core';
import { IconSearch, IconVideoOff } from '@tabler/icons-react';
import { useTagStore, useVideoFileRegistryStore, usePlaylistStore, useNavigationStore } from '../stores';
import { TagFilterGrid } from '../components/Tag/TagFilterGrid';
import { VideoFile } from '../../../shared/models';
import { VideoGrid } from '../components/Video/VideoGrid';

export function TagSearchPage() {
    // 1. 状态管理
    const [inputFocused, setInputFocused] = useState(true);
    const [filterKeyword, setFilterKeyword] = useState('');

    // 2. Store 数据订阅
    const tagsData = useTagStore((state) => state.tagsData);
    const selectedTags = useTagStore((state) => state.selectedTags);
    const addSelectedTag = useTagStore((state) => state.addSelectedTag);
    const removeSelectedTag = useTagStore((state) => state.removeSelectedTag);

    // 获取所有视频档案 (Registry Store)
    const videos = useVideoFileRegistryStore((state) => state.videos);
    const updateAnnotation = useVideoFileRegistryStore((state) => state.updateAnnotation);

    // 导航与播放控制
    const setCurrentPath = usePlaylistStore((state) => state.setCurrentPath);
    const setView = useNavigationStore((state) => state.setView);

    // 3. 搜索核心逻辑 (交集计算)
    const searchResults = useMemo(() => {
        if (selectedTags.length === 0) return [];

        const selectedTagIds = selectedTags.map(t => t.id);
        const allVideos = Object.values(videos);

        // 筛选：视频的标签数组必须包含所有已选标签的 ID (AND Logic)
        return allVideos.filter(video => {
            const videoTags = video.annotation?.tags || [];
            return selectedTagIds.every(id => videoTags.includes(id));
        });
    }, [selectedTags, videos]);

    // 已选 ID 集合用于 Grid 过滤
    const excludedIds = useMemo(() => new Set(selectedTags.map(t => t.id)), [selectedTags]);

    // 4. 交互处理
    const handlePlay = (video: VideoFile) => {
        setCurrentPath(video.path);
        setView('player_page'); // 跳转回播放器
    };

    const handleToggleLike = (video: VideoFile) => {
        const currentLike = video.annotation?.like_count ?? 0;
        updateAnnotation(video.path, {
            like_count: currentLike > 0 ? 0 : 1
        });
    };

    const handleToggleElite = (video: VideoFile) => {
        const currentFavorite = !!video.annotation?.is_favorite;
        updateAnnotation(video.path, {
            is_favorite: !currentFavorite
        });
    };

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#141517' }}>
            {/* 顶部：搜索条件区 */}
            <Box p="md" style={{ borderBottom: '1px solid #333', backgroundColor: '#1a1b1e' }}>
                <TextInput
                    placeholder="🔍 输入关键词过滤标签，点击下方标签加入筛选条件..."
                    value={filterKeyword}
                    onChange={(e) => setFilterKeyword(e.currentTarget.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => {
                        // 延迟失去焦点，确保 TagFilterGrid 的点击事件能先触发
                        setTimeout(() => setInputFocused(false), 200);
                    }}
                    size="md"
                    leftSection={<IconSearch size={18} />}
                    mb={selectedTags.length > 0 ? 'sm' : 0}
                    styles={{ input: { backgroundColor: '#25262b', border: '1px solid #373a40' } }}
                />

                {/* 已选标签胶囊区 */}
                {selectedTags.length > 0 && (
                    <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {selectedTags.map(tag => (
                            <Box
                                key={tag.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '4px 12px',
                                    backgroundColor: '#2b8a3e',
                                    borderRadius: 4,
                                    color: 'white'
                                }}
                            >
                                <Text size="sm" fw={500}>{tag.keywords}</Text>
                                <CloseButton
                                    size="sm"
                                    variant="transparent"
                                    color="white"
                                    onClick={() => removeSelectedTag(tag.id)}
                                />
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* 下部：动态内容区 */}
            <Box style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {inputFocused ? (
                    /* 模式 A：标签选择器 */
                    <Box p="md" style={{ height: '100%' }}>
                        <TagFilterGrid
                            allTagsData={tagsData}
                            filterKeyword={filterKeyword}
                            excludedIds={excludedIds}
                            onTagClick={(tag) => addSelectedTag(tag)}
                        />
                    </Box>
                ) : (
                    /* 模式 B：视频结果网格 */
                    <ScrollArea style={{ height: '100%' }} p="md">
                        {selectedTags.length === 0 ? (
                            <Box style={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <Text c="dimmed">点击上方输入框，选择标签开始搜索</Text>
                            </Box>
                        ) : searchResults.length === 0 ? (
                            <Box style={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                <IconVideoOff size={48} color="#333" />
                                <Text c="dimmed">未找到同时满足以下条件的视频：</Text>
                                <Text fw={700} c="green">{selectedTags.map(t => t.keywords).join(' + ')}</Text>
                            </Box>
                        ) : (
                            <Box>
                                <Text size="xs" c="dimmed" mb="md" fw={700}>
                                    匹配结果: {searchResults.length} 个视频
                                </Text>
                                <VideoGrid
                                    videos={searchResults}
                                    onPlay={handlePlay}
                                    onToggleLike={handleToggleLike}
                                    onToggleElite={handleToggleElite}
                                    emptyMessage="没有找到匹配的视频"
                                />
                            </Box>
                        )}
                    </ScrollArea>
                )}
            </Box>
        </Box>
    );
}