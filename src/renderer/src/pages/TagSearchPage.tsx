import { useState } from 'react';
import { Box, TextInput, Text, CloseButton } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useTagStore, Tag, useVideoStore } from '../stores';
import { TagFilterGrid } from '../components/Tag/TagFilterGrid';

export function TagSearchPage() {
    const [inputFocused, setInputFocused] = useState(true);
    const [filterKeyword, setFilterKeyword] = useState('');

    const tagsData = useTagStore((state) => state.tagsData);
    const selectedTags = useTagStore((state) => state.selectedTags);
    const addSelectedTag = useTagStore((state) => state.addSelectedTag);
    const removeSelectedTag = useTagStore((state) => state.removeSelectedTag);

    // Get excluded IDs (selected tags)
    const excludedIds = new Set(selectedTags.map(t => t.id));

    // Handle tag click from grid
    const handleTagClick = (tag: Tag) => {
        addSelectedTag(tag);
    };

    // Handle remove tag pill
    const handleRemoveTag = (tagId: number) => {
        removeSelectedTag(tagId);
    };

    // Search videos by tags (AND logic)
    const searchResults = (() => {
        if (selectedTags.length === 0) return [];

        // Get all videos from videoStore
        const videos = useVideoStore.getState().videos;

        // Filter videos that have ALL selected tags
        const selectedTagIds = selectedTags.map(t => t.id);

        return videos.filter(video => {
            // Check if video has tags metadata
            if (!video.tags || video.tags.length === 0) return false;

            // Check if video contains ALL selected tags (AND logic)
            return selectedTagIds.every(tagId => video.tags.includes(tagId));
        });
    })();

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20 }}>
            {/* Search Criteria Area */}
            <Box
                style={{
                    padding: 16,
                    backgroundColor: '#1a1a1a',
                    borderRadius: 8,
                    marginBottom: 16,
                }}
            >
                <TextInput
                    placeholder="🔍 添加或搜索标签..."
                    value={filterKeyword}
                    onChange={(e) => setFilterKeyword(e.currentTarget.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => {
                        // Delay to allow click events on tags
                        setTimeout(() => setInputFocused(false), 200);
                    }}
                    size="md"
                    leftSection={<IconSearch size={18} />}
                    style={{ marginBottom: selectedTags.length > 0 ? 12 : 0 }}
                />

                {/* Selected Tag Pills */}
                {selectedTags.length > 0 && (
                    <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {selectedTags.map(tag => (
                            <Box
                                key={tag.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 12px',
                                    backgroundColor: '#2a2a2a',
                                    borderRadius: 16,
                                    border: '1px solid #444',
                                }}
                            >
                                <Text size="sm">{tag.keywords}</Text>
                                <CloseButton
                                    size="xs"
                                    onClick={() => handleRemoveTag(tag.id)}
                                    style={{ color: '#ff4444' }}
                                />
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Dynamic Content Area */}
            <Box style={{ flex: 1, overflow: 'hidden' }}>
                {inputFocused ? (
                    /* Tag Selector Mode */
                    <TagFilterGrid
                        allTagsData={tagsData}
                        filterKeyword={filterKeyword}
                        excludedIds={excludedIds}
                        onTagClick={handleTagClick}
                    />
                ) : (
                    /* Video Results Mode */
                    <Box
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                        }}
                    >
                        {selectedTags.length === 0 ? (
                            <Text c="dimmed">请选择标签开始搜索</Text>
                        ) : searchResults.length === 0 ? (
                            <Box style={{ textAlign: 'center' }}>
                                <Text size="lg" fw={600} mb={8}>
                                    搜索条件
                                </Text>
                                <Text c="dimmed" mb={16}>
                                    {selectedTags.map(t => t.keywords).join(' AND ')}
                                </Text>
                                <Text c="dimmed">没有找到匹配的视频</Text>
                            </Box>
                        ) : (
                            /* Video Grid */
                            <Box
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    gap: 16,
                                    width: '100%',
                                    padding: 16,
                                    overflowY: 'auto',
                                }}
                            >
                                {searchResults.map(video => (
                                    <Box
                                        key={video.id}
                                        style={{
                                            padding: 12,
                                            backgroundColor: '#1a1a1a',
                                            borderRadius: 8,
                                            border: '1px solid #333',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => {
                                            // TODO: Navigate to player with this video
                                            console.log('Play video:', video.path);
                                        }}
                                    >
                                        <Text size="sm" lineClamp={2}>{video.filename}</Text>
                                        <Text size="xs" c="dimmed" mt={4}>
                                            {video.tags?.length || 0} 个标签
                                        </Text>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
