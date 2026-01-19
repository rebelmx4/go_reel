import { Box, Text } from '@mantine/core';
import { VideoFile } from '../../../../shared/models';
import { VideoCard } from '../../components/Video/VideoCard';
import { VList } from 'virtua';

interface SidebarVideoListProps {
    videos: VideoFile[];
    onPlay: (video: VideoFile) => void;
    onToggleLike?: (video: VideoFile) => void;
    onToggleElite?: (video: VideoFile) => void;
    emptyMessage?: string;
}

/**
 * 专门为播放器侧边栏定制的视频列表组件
 * 特点：单列布局、独立滚动、高度自适应
 */
export function SidebarVideoList({
    videos,
    onPlay,
    onToggleLike,
    onToggleElite,
    emptyMessage = '暂无视频'
}: SidebarVideoListProps) {
    if (videos.length === 0) {
        return (
            <Box
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '200px'
                }}
            >
                <Text c="dimmed" size="sm">{emptyMessage}</Text>
            </Box>
        );
    }

    return (
        <Box style={{ height: '100%', width: '100%' }}>
            <VList
                style={{ height: '100%' }}
            >
                {videos.map((video, index) => (
                    <Box
                        key={video.path}
                        style={{
                            // 1. 手动处理间距
                            paddingBottom: 16,
                            // 2. 左右边距
                            paddingLeft: 12,
                            paddingRight: 12,
                            // 3. 第一个元素增加顶部间距
                            paddingTop: index === 0 ? 12 : 0
                        }}
                    >
                        <VideoCard
                            video={video}
                            onPlay={onPlay}
                            onToggleLike={onToggleLike}
                            onToggleElite={onToggleElite}
                        />
                    </Box>
                ))}
            </VList>
        </Box>
    );
}