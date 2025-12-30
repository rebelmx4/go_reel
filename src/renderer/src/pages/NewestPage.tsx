import { useEffect, useMemo } from 'react';
import { Box, Text } from '@mantine/core';
import {
    useVideoStore,
    usePlaylistStore,
    useNavigationStore,
    useNewestPaths // 1. 引入新函数
} from '../stores';
import { VideoGrid } from '../components/Video/VideoGrid';
import { JoinedVideo } from '../../../shared/models';

export function NewestPage() {
    // 1. 使用 selector 获取前100个路径
    const newestPaths = useNewestPaths();
    const videoMap = useVideoStore((state) => state.videos);
    const initStore = useVideoStore((state) => state.initStore);
    const updateAnnotation = useVideoStore((state) => state.updateAnnotation);

    // 2. 获取控制方法
    const setCurrentPath = usePlaylistStore((state) => state.setCurrentPath);
    const setMode = usePlaylistStore((state) => state.setMode);
    const setView = useNavigationStore((state) => state.setView);

    // 3. 计算展示用的视频对象列表
    const newestVideos = useMemo(() => {
        return newestPaths.map(path => videoMap[path]).filter((v): v is JoinedVideo => !!v);
    }, [newestPaths, videoMap]);

    // 初始化加载
    useEffect(() => {
        if (Object.keys(videoMap).length === 0) {
            initStore();
        }
    }, [initStore, videoMap]);

    const handlePlay = (video: JoinedVideo) => {
        // 设置播放模式为 'all' (或者如果你想让它只在最新100个里循环，可以增加一个 'newest' 模式)
        setMode('all');
        // 设置当前路径 (内部自动触发 addHistory)
        setCurrentPath(video.path);
        // 切换视图
        setView('player');
    };

    const handleToggleLike = (video: JoinedVideo) => {
        const currentLike = video.annotation?.like_count ?? 0;
        updateAnnotation(video.path, {
            like_count: currentLike > 0 ? 0 : 1
        });
    };

    const handleToggleElite = (video: JoinedVideo) => {
        const currentFavorite = !!video.annotation?.is_favorite;
        updateAnnotation(video.path, {
            is_favorite: !currentFavorite
        });
    };

    return (
        <Box style={{ height: '100%', overflow: 'auto' }}>
            <Box style={{ padding: '20px 20px 0 20px' }}>
                <Text size="xl" fw={700} mb={4}>最新视频</Text>
                <Text size="sm" c="dimmed" mb={16}>
                    展示最近添加或修改的前 100 个视频
                </Text>
            </Box>

            <VideoGrid
                videos={newestVideos}
                onPlay={handlePlay}
                onToggleLike={handleToggleLike}
                onToggleElite={handleToggleElite}
                emptyMessage="暂无视频，请检查配置的视频路径。"
            />
        </Box>
    );
}