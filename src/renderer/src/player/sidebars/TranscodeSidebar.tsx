// src/renderer/src/player/sidebars/TranscodeSidebar.tsx
import { Box, Text, Progress, Stack, Group, Badge, ActionIcon, ScrollArea, Divider, Button } from '@mantine/core';
import { useTranscodeStore } from '../../stores/useTranscodeStore';
import { IconCheck, IconLoader2, IconX, IconTrash } from '@tabler/icons-react';

export function TranscodeSidebar() {
    const tasks = useTranscodeStore((state) => state.tasks);

    return (
        <Box style={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--mantine-color-dark-7)', borderLeft: '1px solid var(--mantine-color-dark-4)' }}>
            <Box p="md">
                <Group justify="space-between">
                    <Text fw={700}>转码队列</Text>
                    <ActionIcon variant="subtle" color="gray" onClick={() => window.api.clearTranscodeQueue()}>
                        <IconTrash size={18} />
                    </ActionIcon>
                </Group>
                <Text size="xs" c="dimmed">单线程处理 · 退出即消失</Text>
            </Box>

            <Divider color="dark.4" />

            <ScrollArea flex={1} p="md">
                <Stack gap="md">
                    {tasks.length === 0 && <Text c="dimmed" size="sm" ta="center" mt="xl">暂无任务</Text>}

                    {tasks.map((task) => (
                        <Box key={task.path} p="xs" style={{ borderRadius: '4px', backgroundColor: 'var(--mantine-color-dark-6)' }}>
                            <Group justify="space-between" mb={4} wrap="nowrap">
                                <Text size="sm" fw={500} truncate flex={1}>{task.fileName}</Text>
                                {task.status === 'processing' && <IconLoader2 size={16} className="spinning-icon" color="var(--mantine-color-blue-filled)" />}
                                {task.status === 'completed' && <IconCheck size={16} color="var(--mantine-color-green-filled)" />}
                                {task.status === 'failed' && <IconX size={16} color="var(--mantine-color-red-filled)" />}
                            </Group>

                            {task.status === 'processing' && (
                                <Box mt={8}>
                                    <Progress value={task.progress} size="sm" striped animated />
                                    <Text size="xs" ta="right" mt={2}>{task.progress}%</Text>
                                </Box>
                            )}

                            {task.status === 'pending' && <Badge variant="dot" color="gray">等待中</Badge>}
                            {task.status === 'failed' && <Text size="xs" c="red" truncate>{task.error}</Text>}
                        </Box>
                    ))}
                </Stack>
            </ScrollArea>
        </Box>
    );
}