// src/renderer/src/components/Dialog/ExportScreenshotDialog.tsx

import { Modal, Button, Box, Text, Group, ScrollArea, SimpleGrid, UnstyledButton } from '@mantine/core';
import { useState, useEffect } from 'react';
import { IconCheck } from '@tabler/icons-react';
import { useToastStore, useScreenshotStore } from '../../stores';

interface ExportScreenshotDialogProps {
    opened: boolean;
    onClose: () => void;
    videoPath: string | null;
    /** 
     * 外部传入的默认角度。
     * 外部逻辑：如果有存过的值就传存过的值，没有就传根据宽高计算的 0 或 90。
     */
    defaultRotation: number;
}

export function ExportScreenshotDialog({
    opened,
    onClose,
    videoPath,
    defaultRotation
}: ExportScreenshotDialogProps) {
    const [selectedRotation, setSelectedRotation] = useState<0 | 90 | 180 | 270>(0);
    const [loading, setLoading] = useState(false);

    const showToast = useToastStore((state) => state.showToast);
    const screenshots = useScreenshotStore((state) => state.screenshots);
    const firstScreenshot = screenshots.length > 0 ? screenshots[0] : null;

    // 每次打开弹窗，将选中项同步为外部传入的默认值
    useEffect(() => {
        if (opened) {
            setSelectedRotation((defaultRotation % 360) as any);
        }
    }, [opened, defaultRotation]);

    const handleConfirm = async () => {
        if (!videoPath) return;
        setLoading(true);
        try {
            // 如果用户选的角度和传进来的角度不一致，说明发生了更改，需要更新数据库
            if (selectedRotation !== (defaultRotation % 360)) {
                await window.api.updateAnnotation(videoPath, {
                    screenshot_rotation: selectedRotation
                });
            }

            showToast({ message: '正在导出...', type: 'info' });

            // 执行物理导出
            await window.api.exportScreenshots(videoPath, selectedRotation);

            showToast({ message: '截图导出成功', type: 'success' });
            onClose();
        } catch (error) {
            console.error('[ExportDialog] Failed:', error);
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