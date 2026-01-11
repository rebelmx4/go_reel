// src/components/player/PlaybackTimer.tsx

import { Text, Group } from '@mantine/core';
import { usePlayerStore } from '../stores';
import { formatDuration } from '../utils/format';


export function PlaybackTimeLabel() {
    const currentTime = usePlayerStore(state => state.currentTime);
    const duration = usePlayerStore(state => state.duration);

    return (
        <Group gap={4} wrap="nowrap">
            <Text size="xs" c="blue.4" ff="monospace" style={{ minWidth: 45, textAlign: 'right' }}>
                {formatDuration(currentTime)}
            </Text>
            <Text size="xs" c="dimmed" ff="monospace">
                /
            </Text>
            <Text size="xs" c="dimmed" ff="monospace" style={{ minWidth: 45 }}>
                {formatDuration(duration)}
            </Text>
        </Group>
    );
}