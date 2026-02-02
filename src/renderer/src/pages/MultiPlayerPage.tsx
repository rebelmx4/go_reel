// src/renderer/src/pages/MultiPlayerPage.tsx
import { Box, Center, Text, Title } from '@mantine/core';
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
    // 算法：列数 C 是 N 的平方根向上取整
    const cols = Math.ceil(Math.sqrt(N));
    // 算法：行数 R 尽可能接近 C，但行数比列数最多小 1
    const rows = N <= cols * (cols - 1) ? cols - 1 : cols;

    return (
        <Box style={{
            display: 'grid',
            width: '100%',
            height: '100%',
            backgroundColor: '#111',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: '2px',
            overflow: 'hidden'
        }}>
            {paths.map((path, index) => {
                // 判断是否是最后一个，且当前行未满
                const isLast = index === N - 1;
                const currentBatchStart = (rows - 1) * cols;
                const itemsInLastRow = N - currentBatchStart;

                // 如果是最后一个且最后一行没填满，则铺满剩余列
                let span = 1;
                if (isLast && itemsInLastRow < cols) {
                    span = cols - itemsInLastRow + 1;
                }

                return (
                    <MiniPlayer
                        key={path}
                        path={path}
                        onClose={() => removePath(path)}
                        gridSpan={span}
                    />
                );
            })}
        </Box>
    );
}