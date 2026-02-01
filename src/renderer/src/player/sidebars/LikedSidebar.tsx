// src/components/VideoPlayer/sidebars/LikedSidebar.tsx

import { useState, useMemo } from 'react';
import { Box, Text, ScrollArea, UnstyledButton, Stack, Divider, SimpleGrid } from '@mantine/core';
import { useVideoFileRegistryStore, usePlaylistStore } from '../../stores';
import { VideoCard } from '../../components/Video/VideoCard';

interface Segment {
    label: string;
    min: number;
    max: number;
}

export function LikedSidebar() {
    const { videos, videoPaths } = useVideoFileRegistryStore();
    const { currentPath, jumpTo } = usePlaylistStore();

    // 1. 获取所有有分数的视频
    const likedVideos = useMemo(() => {
        return videoPaths
            .map(p => videos[p])
            .filter(v => (v.annotation?.like_count ?? 0) !== 0);
    }, [videos, videoPaths]);

    // 2. 动态生成分段逻辑
    const segments = useMemo(() => {
        const scores = likedVideos.map(v => v.annotation?.like_count || 0);
        if (scores.length === 0) return [];

        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const results: Segment[] = [];

        // 正分段 [1, Max]
        if (max >= 1) {
            const step = Math.max(1, (max - 1) / 10);
            for (let i = 9; i >= 0; i--) {
                const sMin = 1 + i * step;
                const sMax = 1 + (i + 1) * step;
                // 检查该段是否有视频
                if (likedVideos.some(v => (v.annotation?.like_count || 0) >= sMin && (v.annotation?.like_count || 0) <= sMax)) {
                    results.push({ label: `Score: ${Math.floor(sMin)} ~ ${Math.floor(sMax)}`, min: sMin, max: sMax });
                }
            }
        }

        // 负分段 [Min, -1]
        if (min <= -1) {
            const step = Math.abs((min + 1) / 10);
            for (let i = 0; i < 10; i++) {
                const sMax = -1 - i * step;
                const sMin = -1 - (i + 1) * step;
                if (likedVideos.some(v => (v.annotation?.like_count || 0) >= sMin && (v.annotation?.like_count || 0) <= sMax)) {
                    results.push({ label: `Score: ${Math.ceil(sMin)} ~ ${Math.ceil(sMax)}`, min: sMin, max: sMax });
                }
            }
        }
        return results;
    }, [likedVideos]);

    // 3. 本地状态：选中的段
    const [activeSegment, setActiveSegment] = useState<Segment | null>(segments[0] || null);

    // 4. 过滤右侧显示的视频 (按分数降序)
    const filteredVideos = useMemo(() => {
        if (!activeSegment) return [];
        return likedVideos
            .filter(v => {
                const s = v.annotation?.like_count || 0;
                return s >= activeSegment.min && s <= activeSegment.max;
            })
            .sort((a, b) => (b.annotation?.like_count || 0) - (a.annotation?.like_count || 0));
    }, [likedVideos, activeSegment]);

    return (
        <Box style={{ width: 450, height: '100%', display: 'flex', backgroundColor: '#141414', borderLeft: '1px solid #333' }}>
            {/* 左侧：分段导航 (150px) */}
            <Box style={{ width: 150, borderRight: '1px solid #333' }}>
                <ScrollArea h="100%">
                    <Stack gap={0}>
                        {segments.map((seg, idx) => (
                            <UnstyledButton
                                key={idx}
                                onClick={() => setActiveSegment(seg)}
                                p="md"
                                style={{
                                    backgroundColor: activeSegment === seg ? '#2c2e33' : 'transparent',
                                    borderLeft: activeSegment === seg ? '3px solid #228be6' : '3px solid transparent'
                                }}
                            >
                                <Text size="xs" fw={activeSegment === seg ? 700 : 400} c={activeSegment === seg ? 'blue.4' : 'dimmed'}>
                                    {seg.label}
                                </Text>
                            </UnstyledButton>
                        ))}
                    </Stack>
                </ScrollArea>
            </Box>

            {/* 右侧：视频网格 */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box p="sm" style={{ borderBottom: '1px solid #333' }}>
                    <Text size="sm" fw={700}>{activeSegment?.label || '无评分数据'}</Text>
                </Box>
                <ScrollArea style={{ flex: 1 }} p="sm">
                    <SimpleGrid cols={1} spacing="sm">
                        {filteredVideos.map(v => (
                            <Box key={v.path} style={{ position: 'relative' }}>
                                <VideoCard
                                    video={v}
                                    isSelected={currentPath === v.path}
                                    onPlay={(video) => jumpTo(video.path, 'liked', undefined, activeSegment || undefined)}
                                />
                                <Box style={{
                                    position: 'absolute', top: 5, right: 5,
                                    backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4,
                                    zIndex: 11, pointerEvents: 'none'
                                }}>
                                    <Text size="xs" c={v.annotation?.like_count! > 0 ? 'red.5' : 'blue.5'}>
                                        {Math.floor(v.annotation?.like_count || 0)}
                                    </Text>
                                </Box>
                            </Box>
                        ))}
                    </SimpleGrid>
                </ScrollArea>
            </Box>
        </Box>
    );
}