import { Box } from '@mantine/core';
import { TitleBar } from './TitleBar';
import { BottomControlBar } from './BottomControlBar';
import { ReactNode } from 'react';

interface MainLayoutProps {
    children: ReactNode;
}

/**
 * Main Layout Component
 * Provides the overall application structure:
 * - Custom Title Bar (with navigation tabs and window controls)
 * - Main Content Area
 * - Bottom Control Bar
 */
export function MainLayout({ children }: MainLayoutProps) {
    return (
        <Box
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                width: '100vw',
                overflow: 'hidden',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            }}
        >
            {/* Custom Title Bar (includes navigation tabs) */}
            <TitleBar />

            {/* Main Content Area */}
            <Box
                style={{
                    flex: 1,
                    overflow: 'auto',
                    backgroundColor: 'var(--mantine-color-dark-8)',
                }}
            >
                {children}
            </Box>

        </Box>
    );
}
