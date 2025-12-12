import { Group, Text, ActionIcon, Tooltip, Box, Button, Slider, Menu } from '@mantine/core';
import {
    IconVolume, IconVolume2, IconVolume3,
    IconPlayerSkipForward, IconCamera, IconArrowRight,
    IconColumns3, IconScissors
} from '@tabler/icons-react';
import { usePlayerStore, useScreenshotStore } from '../stores';
import { RefObject, useEffect } from 'react';
import { ProgressBarWithThumbnail } from './ProgressBarWithThumbnail';
import { ScreenshotTrack } from './ScreenshotTrack'; // 【修改1】引入新的组件

interface PlayerControlsProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    onScreenshot: () => void;
    onNext: () => void;
    onRotate: () => void;
}

export function PlayerControls({ videoRef, onScreenshot, onNext, onRotate }: PlayerControlsProps) {
    const currentTime = usePlayerStore((state) => state.currentTime);
    const duration = usePlayerStore((state) => state.duration);
    const volume = usePlayerStore((state) => state.volume);
    const rotation = usePlayerStore((state) => state.rotation);
    const stepMode = usePlayerStore((state) => state.stepMode);
    const skipFrameMode = usePlayerStore((state) => state.skipFrameMode);
    const currentVideoPath = usePlayerStore((state) => state.currentVideoPath);

    const setVolume = usePlayerStore((state) => state.setVolume);
    const setRotation = usePlayerStore((state) => state.setRotation);
    const setStepMode = usePlayerStore((state) => state.setStepMode);
    const setSkipFrameMode = usePlayerStore((state) => state.setSkipFrameMode);

    // 截图相关的状态依然需要，因为截图按钮在这里
    const isCropMode = useScreenshotStore((state) => state.isCropMode);
    const setCropMode = useScreenshotStore((state) => state.setCropMode);

    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (value: number) => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = value;
    };

    // 【修改2】定义一个专门用于处理截图点击跳转的函数
    const handleScreenshotSeek = (timestampInMS: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = timestampInMS / 1000; // 转换为秒
        }
    };

    // ... (其他 handle 函数保持不变)
    const handleStepModeClick = () => setStepMode(stepMode === 'frame' ? 'second' : 'frame');
    const handleSkipFrameClick = () => setSkipFrameMode(!skipFrameMode);
    const handleCropModeClick = () => setCropMode(!isCropMode);

    useEffect(() => {
        if (window.api?.saveVolume) {
            window.api.saveVolume(volume);
        }
    }, [volume]);

    // 【修改3】所有与截图轨道相关的 useEffect, useState, useRef 和 handle 函数都已被移除

    return (
        <Box
            style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderTop: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
            }}
        >
            {/* 【修改4】使用新的 ScreenshotTrack 组件，并传入跳转回调 */}
            <ScreenshotTrack onScreenshotClick={handleScreenshotSeek} />

            {/* 进度条 */}
            <Group gap="xs" style={{ width: '100%' }}>
                <Text size="xs" c="dimmed" style={{ minWidth: 40 }}>{formatTime(currentTime)}</Text>
                <Box style={{ flex: 1 }}>
                    <ProgressBarWithThumbnail
                        currentTime={currentTime}
                        duration={duration}
                        videoPath={currentVideoPath}
                        onSeek={handleSeek}
                    />
                </Box>
                <Text size="xs" c="dimmed" style={{ minWidth: 40 }}>{formatTime(duration)}</Text>
            </Group>

            {/* 控制按钮行 */}
            <Group justify="space-between">
                <Group>
                    {/* ... (所有左侧按钮保持不变) ... */}
                    <Tooltip label={skipFrameMode ? "退出跳帧模式" : "进入跳帧模式"}>
                        <ActionIcon variant={skipFrameMode ? "filled" : "subtle"} color={skipFrameMode ? "blue" : "gray"} onClick={handleSkipFrameClick}>
                            {skipFrameMode ? <IconColumns3 size={20} /> : <IconArrowRight size={20} />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={`当前步进: ${stepMode === 'frame' ? '1帧' : '1秒'} (点击切换)`}>
                        <Button variant="subtle" color="gray" size="xs" onClick={handleStepModeClick} style={{ width: 40, padding: 0 }}>
                            {stepMode === 'frame' ? '帧' : '秒'}
                        </Button>
                    </Tooltip>
                    <Tooltip label="点击重置旋转 (快捷键: Alt+R 旋转90°)">
                        <Button variant="subtle" color="gray" size="xs" onClick={onRotate} style={{ width: 40, padding: 0 }}>
                            {rotation % 360}°
                        </Button>
                    </Tooltip>
                    <Tooltip label="截图 (快捷键: E)">
                        <ActionIcon variant="subtle" color="gray" onClick={onScreenshot}>
                            <IconCamera size={20} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={isCropMode ? "退出框选模式" : "框选截图"}>
                        <ActionIcon variant={isCropMode ? "filled" : "subtle"} color={isCropMode ? "green" : "gray"} onClick={handleCropModeClick}>
                            <IconScissors size={20} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
                <Group>
                    {/* ... (所有右侧按钮保持不变) ... */}
                    <Group gap={5}>
                        {volume === 0 ? <IconVolume3 size={18} /> : volume < 50 ? <IconVolume2 size={18} /> : <IconVolume size={18} />}
                        <Slider value={volume} onChange={setVolume} style={{ width: 80 }} size="xs" color="gray" />
                    </Group>
                    <Tooltip label="下一个视频 (PageDown)">
                        <ActionIcon variant="subtle" color="gray" onClick={onNext}>
                            <IconPlayerSkipForward size={20} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Box>
    );
}