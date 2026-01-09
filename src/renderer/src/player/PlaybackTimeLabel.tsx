// src/components/player/PlaybackTimer.tsx

import { Text, Group } from '@mantine/core';
import { usePlayerStore } from '../stores'; // 直接引入 store

/**
 * 格式化秒数为 hh:mm:ss 或 mm:ss
 */
const formatTime = (timeInSeconds: number) => {
    const h = Math.floor(timeInSeconds / 3600);
    const m = Math.floor((timeInSeconds % 3600) / 60);
    const s = Math.floor(timeInSeconds % 60);

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export function PlaybackTimeLabel() {
    const currentTime = usePlayerStore(state => state.currentTime);
    const duration = usePlayerStore(state => state.duration);

    return (
        <Group gap={4} wrap="nowrap">
            <Text size="xs" c="blue.4" ff="monospace" style={{ minWidth: 45, textAlign: 'right' }}>
                {formatTime(currentTime)}
            </Text>
            <Text size="xs" c="dimmed" ff="monospace">
                /
            </Text>
            <Text size="xs" c="dimmed" ff="monospace" style={{ minWidth: 45 }}>
                {formatTime(duration)}
            </Text>
        </Group>
    );
}