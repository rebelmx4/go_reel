// src/components/Video/CoverGrid.tsx

import { SimpleGrid, Box, Text, Center } from '@mantine/core';
import { VideoFile } from '../../stores';
import { CoverCard } from './CoverCard';

interface CoverGridProps {
    videos: VideoFile[];
    onPlay: (video: VideoFile) => void;
    emptyMessage?: string;
}

export function CoverGrid({ videos, onPlay, emptyMessage = "无内容" }: CoverGridProps) {
    if (!videos || videos.length === 0) {
        return (
            <Center style={{ height: '50vh' }}>
                <Text c="dimmed">{emptyMessage}</Text>
            </Center>
        );
    }

    return (
        <Box style={{ padding: '0 20px 20px 20px' }}>
            <SimpleGrid
                cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }}
                spacing="md"
                verticalSpacing="md"
            >
                {videos.map((video, index) => {
                    // ✨ 新增的打印语句，用于在浏览器控制台检查 key 的值
                    console.log(`[CoverGrid] 正在渲染第 ${index + 1} 个卡片, 使用的 Key: ${video.hash}`);

                    // 返回组件 JSX
                    return (
                        <CoverCard
                            key={video.path}
                            video={video}
                            onPlay={onPlay}
                        />
                    );
                })}
            </SimpleGrid>
        </Box>
    );
}