// src/renderer/src/components/Dialog/ExportScreenshotDialog.tsx

import { Modal, Button, Box, Text, Group, ScrollArea, SimpleGrid, UnstyledButton } from '@mantine/core';
import { useState, useEffect } from 'react';
import { IconCheck } from '@tabler/icons-react';
import { useToastStore, useScreenshotStore, useVideoFileRegistryStore } from '../../stores';

interface ExportScreenshotDialogProps {
    opened: boolean;
    onClose: () => void;
    videoPath: string | null;
    defaultRotation: number;
}

export function ExportScreenshotDialog({
    opened,
    onClose,
    videoPath,
    defaultRotation: number
}: ExportScreenshotDialogProps) {
    const [selectedRotation, setSelectedRotation] = useState<0 | 90 | 180 | 270>(0);
    const [loading, setLoading] = useState(false);

    const showToast = useToastStore((state) => state.showToast);
    const screenshots = useScreenshotStore((state) => state.screenshots);
    const firstScreenshot = screenshots.length > 0 ? screenshots[0] : null;
    const [isInitializing, setIsInitializing] = useState(true);
    const videoFile = useVideoFileRegistryStore((state) => videoPath ? state.videos[videoPath] : null);

    useEffect(() => {
        async function determineDefaultRotation() {
            if (!opened || !videoPath) return;

            setIsInitializing(true);
            try {
                // 1. 优先检查数据库中是否已有“截图旋转”记录
                const savedRotation = videoFile?.annotation?.screenshot_rotation;
                if (savedRotation !== undefined && savedRotation !== null) {
                    setSelectedRotation(savedRotation as any);
                    return;
                }

                // 2. 如果没有记录，从后端获取物理元数据
                const metadata = await window.api.getVideoMetadata(videoPath);

                if (metadata) {
                    // 横竖屏判定逻辑：
                    // 横屏 (width > height) -> 默认 90
                    // 竖屏 (width <= height) -> 默认 0
                    const defaultRot = metadata.width > metadata.height ? 90 : 0;
                    setSelectedRotation(defaultRot);
                } else {
                    // 兜底：如果元数据也拿不到，默认 0
                    setSelectedRotation(0);
                }
            } catch (err) {
                console.error('Failed to get metadata:', err);
            } finally {
                setIsInitializing(false);
            }
        }

        determineDefaultRotation();
    }, [opened, videoPath, videoFile?.annotation?.screenshot_rotation]);

    const handleConfirm = async () => {
        if (!videoPath) return;
        setLoading(true);
        try {
            // 只要用户确认了，我们就更新数据库（确保下次打开还是这个角度）
            await window.api.updateAnnotation(videoPath, {
                screenshot_rotation: selectedRotation
            });

            showToast({ message: '正在导出...', type: 'info' });
            await window.api.exportScreenshots(videoPath, selectedRotation);
            showToast({ message: '截图导出成功', type: 'success' });
            onClose();
        } catch (error) {
            showToast({ message: '导出失败', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const rotationOptions: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="导出截图配置"
            size="xl"
            centered
            overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        >
            <Box style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 1. 旋转选择区 */}
                <Box>
                    <Text size="sm" fw={500} mb="xs">选择导出旋转角度</Text>
                    <SimpleGrid cols={4} spacing="md">
                        {rotationOptions.map((rot) => (
                            <UnstyledButton
                                key={rot}
                                onClick={() => setSelectedRotation(rot)}
                                style={{
                                    border: `2px solid ${selectedRotation === rot ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-dark-4)'}`,
                                    borderRadius: 8,
                                    padding: 8,
                                    backgroundColor: selectedRotation === rot ? 'rgba(34, 139, 230, 0.1)' : 'var(--mantine-color-dark-6)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 8,
                                    position: 'relative'
                                }}
                            >
                                {selectedRotation === rot && (
                                    <Box style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'var(--mantine-color-blue-6)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconCheck size={14} color="white" />
                                    </Box>
                                )}

                                <Box style={{ width: '100%', aspectRatio: '1/1', background: '#000', borderRadius: 4, overflow: 'hidden' }}>
                                    {firstScreenshot && (
                                        <img
                                            src={firstScreenshot.path}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                transform: `rotate(${rot}deg)`,
                                                transition: 'transform 0.2s ease'
                                            }}
                                        />
                                    )}
                                </Box>
                                <Text size="sm">{rot}°</Text>
                            </UnstyledButton>
                        ))}
                    </SimpleGrid>
                </Box>

                {/* 2. 预览区 */}
                <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={500} mb="xs">预览 ({screenshots.length} 张)</Text>
                    <Box style={{ backgroundColor: 'var(--mantine-color-dark-8)', borderRadius: 8, padding: 10 }}>
                        <ScrollArea h={300} type="always">
                            <SimpleGrid cols={4} spacing="sm">
                                {screenshots.map((s) => (
                                    <Box key={s.filename} style={{ aspectRatio: '1/1', background: '#111', borderRadius: 4, overflow: 'hidden' }}>
                                        <img
                                            src={s.path}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                transform: `rotate(${selectedRotation}deg)`
                                            }}
                                        />
                                    </Box>
                                ))}
                            </SimpleGrid>
                        </ScrollArea>
                    </Box>
                </Box>

                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose} disabled={loading}>取消</Button>
                    <Button onClick={handleConfirm} loading={loading} disabled={!videoPath}>
                        确认导出
                    </Button>
                </Group>
            </Box>
        </Modal>
    );
}