import { useToastStore } from '../stores';
import { Box, Paper, Text, Transition } from '@mantine/core';

/**
 * Toast Container Component
 * Displays toast notifications in the top-left corner with stacking
 */
export function ToastContainer() {
    const toasts = useToastStore((state) => state.toasts);

    return (
        <Box
            style={{
                position: 'fixed',
                top: 16,
                left: 16,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                pointerEvents: 'none',
            }}
        >
            {toasts.map((toast) => (
                <Transition
                    key={toast.id}
                    mounted={true}
                    transition="slide-right"
                    duration={200}
                    timingFunction="ease"
                >
                    {(styles) => (
                        <Paper
                            shadow="md"
                            p="md"
                            style={{
                                ...styles,
                                pointerEvents: 'auto',
                                minWidth: 200,
                                maxWidth: 400,
                            }}
                        >
                            <Text size="sm">{toast.message}</Text>
                        </Paper>
                    )}
                </Transition>
            ))}
        </Box>
    );
}
