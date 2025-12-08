import { Box, Text } from '@mantine/core';
import { useRecordingStore } from '../stores';
import { useEffect } from 'react';

export function RecordingIndicator() {
    const isRecording = useRecordingStore((state) => state.isRecording);
    const elapsedTime = useRecordingStore((state) => state.elapsedTime);
    const updateElapsedTime = useRecordingStore((state) => state.updateElapsedTime);

    useEffect(() => {
        if (!isRecording) return;

        const interval = setInterval(() => {
            const elapsed = Date.now() - useRecordingStore.getState().startTime;
            updateElapsedTime(elapsed);
        }, 100);

        return () => clearInterval(interval);
    }, [isRecording, updateElapsedTime]);

    if (!isRecording) return null;

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <Box
            style={{
                position: 'fixed',
                top: 40,
                right: 20,
                zIndex: 10000,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: '8px 16px',
                borderRadius: 8,
                border: '2px solid #ff0000',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
            }}
        >
            {/* Recording dot */}
            <Box
                style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#ff0000',
                    animation: 'pulse 1.5s ease-in-out infinite',
                }}
            />

            <Text size="sm" fw={700} c="#ff0000">
                REC
            </Text>

            <Text size="sm" fw={500} c="white">
                {formatTime(elapsedTime)}
            </Text>

            {/* CSS for pulse animation */}
            <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
        </Box>
    );
}
