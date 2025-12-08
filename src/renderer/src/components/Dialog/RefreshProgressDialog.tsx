import { useState } from 'react';
import { Modal, Box, Text, Progress, Stack } from '@mantine/core';

interface RefreshProgressDialogProps {
    opened: boolean;
    onClose: () => void;
}

interface RefreshProgress {
    phase: 'scanning' | 'hashing' | 'syncing' | 'complete';
    current: number;
    total: number;
    currentFile?: string;
}

export function RefreshProgressDialog({ opened, onClose }: RefreshProgressDialogProps) {
    const [progress, setProgress] = useState<RefreshProgress>({
        phase: 'scanning',
        current: 0,
        total: 0
    });

    // Listen for progress events
    useState(() => {
        if (window.electron?.ipcRenderer) {
            const handler = (_event: any, data: RefreshProgress) => {
                setProgress(data);

                // Auto close when complete
                if (data.phase === 'complete') {
                    setTimeout(() => {
                        onClose();
                    }, 1000);
                }
            };

            window.electron.ipcRenderer.on('refresh-progress', handler);

            return () => {
                window.electron.ipcRenderer.removeListener('refresh-progress', handler);
            };
        }
    });

    const getPhaseText = () => {
        switch (progress.phase) {
            case 'scanning':
                return '扫描文件中...';
            case 'hashing':
                return '计算哈希中...';
            case 'syncing':
                return '同步元数据中...';
            case 'complete':
                return '刷新完成！';
            default:
                return '处理中...';
        }
    };

    const getProgressPercent = () => {
        if (progress.total === 0) return 0;
        return Math.round((progress.current / progress.total) * 100);
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="刷新文件库"
            centered
            closeOnClickOutside={false}
            closeOnEscape={false}
            withCloseButton={false}
        >
            <Stack gap="md">
                <Text size="lg" fw={600}>
                    {getPhaseText()}
                </Text>

                <Progress
                    value={getProgressPercent()}
                    size="xl"
                    radius="md"
                    animated={progress.phase !== 'complete'}
                />

                <Box>
                    <Text size="sm" c="dimmed">
                        进度: {progress.current} / {progress.total}
                    </Text>
                    {progress.currentFile && progress.phase === 'hashing' && (
                        <Text size="xs" c="dimmed" lineClamp={1} mt={4}>
                            当前文件: {progress.currentFile}
                        </Text>
                    )}
                </Box>
            </Stack>
        </Modal>
    );
}
