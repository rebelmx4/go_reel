// src/renderer/src/pages/MultiPlayerPage.tsx
import { Box, Center, Text } from '@mantine/core';
import { useMultiPlayerStore } from '../stores/multiPlayerStore';
import { MiniPlayer } from '../player/MiniPlayer';

export function MultiPlayerPage() {
    const { paths, removePath } = useMultiPlayerStore();

    if (paths.length === 0) {
        return (
            <Center h="100%">
                <Text c="dimmed">尚未添加视频到多窗口模式</Text>
            </Center>
        );
    }

    const N = paths.length;
    const cols = Math.ceil(Math.sqrt(N));
    const rows = N <= cols * (cols - 1) ? cols - 1 : cols;

    return (
        <Box style={{
            display: 'grid',
            width: '100%',
            height: '100%',
            backgroundColor: '#111',
            // 使用 minmax(0, 1fr) 防止内容撑开网格
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            // 整个网格居中对齐
            placeContent: 'center',
            gap: '2px',
            overflow: 'hidden',
            padding: '2px' // 留一点缝隙防止边框被切
        }}>
            {paths.map((path) => {
                return (
                    <MiniPlayer
                        key={path}
                        path={path}
                        onClose={() => removePath(path)}
                    // 移除 gridSpan 逻辑，所有视频保持 1:1 比例格
                    />
                );
            })}
        </Box>
    );
}