import { useEffect, useMemo } from 'react';
import { Box, Text } from '@mantine/core';
import { useVideoStore, usePlayerStore, useNavigationStore, usePlaylistStore, useHistoryStore, VideoFile } from '../stores';
import { VideoGrid } from '../components/Video/VideoGrid';

export function HistoryPage() {
    // 1. 获取历史记录路径列表 & 加载动作
    const historyPaths = useHistoryStore((state) => state.historyPaths);
    const loadHistory = useHistoryStore((state) => state.loadHistory);

    // 2. 获取全量视频数据（作为仓库）
    const allVideos = useVideoStore((state) => state.videos);
    const loadVideos = useVideoStore((state) => state.loadVideos);
    const toggleLike = useVideoStore((state) => state.toggleLike);
    const toggleElite = useVideoStore((state) => state.toggleElite);

    // 3. 导航与播放控制
    const setCurrentVideo = usePlayerStore((state) => state.setCurrentVideo);
    const setView = useNavigationStore((state) => state.setView);
    const setCurrentVideoId = usePlaylistStore((state) => state.setCurrentVideo);

    // 4. 【核心逻辑】将路径列表转换为视频对象列表
    // 当 historyPaths 变化（有新播放）或 allVideos 变化（元数据加载完）时自动重新计算
    const historyVideos = useMemo(() => {
        if (!allVideos.length) return [];

        return historyPaths
            .map(path => allVideos.find(v => v.path === path))
            .filter((v): v is VideoFile => v !== undefined); // 过滤掉已删除或未扫描到的视频
    }, [historyPaths, allVideos]);

    // 初始化：加载历史记录和视频库
    useEffect(() => {
        loadHistory();
        loadVideos();
    }, [loadHistory, loadVideos]);

    const handlePlay = (video: VideoFile) => {
        // 设置文件路径给播放器
        setCurrentVideo(video.path);
        // 设置 Hash ID 给播放列表逻辑
        setCurrentVideoId(video.hash);
        // 切换视图
        setView('player');

        // 注意：这里不需要手动调用 addToHistory，
        // 因为 VideoPlayer 组件内部已经监听了 currentVideoPath 变化并自动写入 historyStore
    };

    return (
        <Box style={{ height: '100%', overflow: 'auto' }}>
            <Box style={{ padding: '20px 20px 0 20px' }}>
                <Text size="xl" fw={700} mb={4}>最近播放</Text>
                <Text size="sm" c="dimmed" mb={16}>
                    保留最近 100 条播放记录
                </Text>
            </Box>

            <VideoGrid
                videos={historyVideos}
                onPlay={handlePlay}
                onToggleLike={(v) => toggleLike(v.hash)}
                onToggleElite={(v) => toggleElite(v.hash)}
                emptyMessage="暂无播放记录，快去观看视频吧！"
            />
        </Box>
    );
}