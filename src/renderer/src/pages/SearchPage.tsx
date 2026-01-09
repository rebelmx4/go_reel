import { useState, useEffect } from 'react';
import { Box, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { usePlayerStore, useNavigationStore, usePlaylistStore } from '../stores';
import { VideoGrid } from '../components/Video/VideoGrid';

export function SearchPage() {
    // const [keyword, setKeyword] = useState('');
    // const searchByFilename = useVideoStore((state) => state.searchByFilename);
    // const loadVideos = useVideoStore((state) => state.loadVideos);
    // const toggleLike = useVideoStore((state) => state.toggleLike);
    // const toggleElite = useVideoStore((state) => state.toggleElite);
    // const updateLastPlayed = useVideoStore((state) => state.updateLastPlayed);

    // const setCurrentVideo = usePlaylistStore((state) => state.setCurrentPath);
    // const setView = useNavigationStore((state) => state.setView);

    // useEffect(() => {
    //     loadVideos();
    // }, [loadVideos]);

    // const results = keyword ? searchByFilename(keyword) : [];

    // const handlePlay = (video: any) => {
    //     setCurrentVideo(video.path);
    //     updateLastPlayed(video.id);
    //     setView('player');
    // };

    // return (
    //     <Box style={{ height: '100%', overflow: 'auto' }}>
    //         <Box style={{ padding: 20 }}>
    //             <Text size="xl" fw={700} mb={4}>文件名搜索</Text>
    //             <Text size="sm" c="dimmed" mb={16}>
    //                 输入关键词搜索视频文件名
    //             </Text>

    //             <TextInput
    //                 placeholder="输入文件名关键词..."
    //                 value={keyword}
    //                 onChange={(e) => setKeyword(e.currentTarget.value)}
    //                 leftSection={<IconSearch size={18} />}
    //                 size="md"
    //                 mb={20}
    //             />

    //             {keyword && (
    //                 <Text size="sm" c="dimmed" mb={16}>
    //                     找到 {results.length} 个结果
    //                 </Text>
    //             )}
    //         </Box>

    //         {keyword ? (
    //             <VideoGrid
    //                 videos={results}
    //                 onPlay={handlePlay}
    //                 onToggleLike={(v) => toggleLike(v.id)}
    //                 onToggleElite={(v) => toggleElite(v.id)}
    //                 emptyMessage="未找到匹配的视频"
    //             />
    //         ) : (
    //             <Box
    //                 style={{
    //                     display: 'flex',
    //                     alignItems: 'center',
    //                     justifyContent: 'center',
    //                     height: 300,
    //                 }}
    //             >
    //                 <Text c="dimmed">请输入关键词开始搜索</Text>
    //             </Box>
    //         )}
    //     </Box>
    // );
}
