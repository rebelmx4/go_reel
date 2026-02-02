// src/renderer/src/player/StoryboardStartOverlay.tsx

import { Image, Transition, Box } from '@mantine/core';
import { useEffect, useState } from 'react';
import { usePlayerStore, useScreenshotStore, usePlaylistStore } from '../stores';

export function StoryboardStartOverlay() {
    const storyboardUrl = useScreenshotStore(state => state.storyboardUrl);
    const duration = usePlayerStore(state => state.duration);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const currentPath = usePlaylistStore(state => state.currentPath);

    const [visible, setVisible] = useState(false);

    // 触发逻辑
    useEffect(() => {
        // 条件：有图、时长 > 120s
        if (storyboardUrl && duration > 120) {
            setVisible(true);

            const timer = setTimeout(() => {
                setVisible(false);
            }, 3000); // 3秒后消失

            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [currentPath, storyboardUrl, duration]);

    // 如果用户开始播放或点击（isPlaying 变为 true 且可见时），可选立即消失
    useEffect(() => {
        if (isPlaying && visible) {
            // setVisible(false); // 如果你希望一播就消失，取消注释
        }
    }, [isPlaying]);

    return (
        <Transition mounted={visible} transition="fade" duration={800} timingFunction="ease">
            {(styles) => (
                <Box
                    style={{
                        ...styles,
                        position: 'absolute',
                        inset: 0,
                        zIndex: 100, // 确保在视频之上
                        backgroundColor: 'black',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none' // 不阻碍双击播放/暂停
                    }}
                >
                    <Image
                        src={storyboardUrl}
                        fit="contain"
                        w="100%"
                        h="100%"
                        style={{ boxShadow: '0 0 50px rgba(0,0,0,0.9)' }}
                    />
                </Box>
            )}
        </Transition>
    );
}