// src/renderer/src/player/sidebars/SidebarVideoList.tsx

import { Box, Text } from '@mantine/core';
import { VideoFile } from '../../../../shared/models';
import { VideoCard } from '../../components/Video/VideoCard';

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
        <Box
            style={{
                height: '100%',
                overflowY: 'auto',
                // 自定义滚动条样式，使其在侧边栏更美观
                scrollbarWidth: 'thin',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px' // 卡片之间的间距
            }}
        >
            {videos.map(video => (
                <Box
                    key={video.path}
                    style={{
                        flexShrink: 0,
                        width: '100%' // 确保卡片填满 300px 宽度
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

            {/* 底部留白，防止最后一个卡片紧贴边缘 */}
            <Box style={{ height: 20, flexShrink: 0 }} />
        </Box>
    );
}