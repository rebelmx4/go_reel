import { Box, Text, Progress, Stack } from '@mantine/core';
import { useRefreshStore } from '../stores';

export function RefreshLoadingScreen() {
    const progress = useRefreshStore((state) => state.progress);

    if (!progress.isRefreshing) return null;

    const percentage = progress.totalFiles > 0
        ? Math.round((progress.processedFiles / progress.totalFiles) * 100)
        : 0;

    return (
        <Box
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Stack align="center" gap="xl" style={{ width: '80%', maxWidth: 600 }}>
                {/* Title */}
                <Text size="xl" fw={700} c="#00ff00">
                    正在刷新文件库...
                </Text>

                {/* Progress Bar */}
                <Box style={{ width: '100%' }}>
                    <Progress
                        value={percentage}
                        size="xl"
                        color="#00ff00"
                        striped
                        animated
                        style={{ marginBottom: 16 }}
                    />
                    <Text size="sm" c="dimmed" ta="center">
                        {progress.processedFiles} / {progress.totalFiles} 文件 ({percentage}%)
                    </Text>
                </Box>

                {/* Current Directory */}
                <Box
                    style={{
                        width: '100%',
                        padding: '16px 24px',
                        backgroundColor: '#1a1a1a',
                        borderRadius: 8,
                        border: '1px solid #333',
                    }}
                >
                    <Text size="xs" c="dimmed" mb={4}>
                        当前扫描目录：
                    </Text>
                    <Text
                        size="sm"
                        fw={500}
                        style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {progress.currentDirectory || '准备中...'}
                    </Text>
                </Box>

                {/* Info */}
                <Text size="xs" c="dimmed" ta="center" style={{ maxWidth: 400 }}>
                    正在扫描视频文件并计算哈希值，以同步文件系统变更。
                    <br />
                    此过程可能需要几分钟，请耐心等待...
                </Text>
            </Stack>
        </Box>
    );
}
