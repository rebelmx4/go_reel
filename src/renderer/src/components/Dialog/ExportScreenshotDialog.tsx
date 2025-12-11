import { Modal, Button, Box, Text, Group, ScrollArea, SimpleGrid, UnstyledButton } from '@mantine/core';
import { useState, useEffect } from 'react';
import { IconCheck } from '@tabler/icons-react';
import { useToastStore } from '../../stores';
import { Screenshot } from '../../stores/screenshotStore'; // 假设你的 Store 定义在这里，或者从 VideoPlayer 引入接口

interface ExportScreenshotDialogProps {
    opened: boolean;
    onClose: () => void;
    screenshots: Screenshot[];
    videoHash: string | null;  // 传入 Hash
    initialRotation: number | null; // null 表示未设置过
}

export function ExportScreenshotDialog({
    opened,
    onClose,
    screenshots,
    videoHash,
    initialRotation
}: ExportScreenshotDialogProps) {
    // 默认选中 0，如果有历史记录则选中历史记录
    const [selectedRotation, setSelectedRotation] = useState<0 | 90 | 180 | 270>(0);
    const [loading, setLoading] = useState(false);
    const showToast = useToastStore((state) => state.showToast);

    // 当弹窗打开时，初始化选中状态
    useEffect(() => {
        if (opened) {
            setSelectedRotation((initialRotation ?? 0) as 0 | 90 | 180 | 270);
        }
    }, [opened, initialRotation]);

    // 获取第一张截图用于顶部 4 个按钮的预览
    const firstScreenshot = screenshots.length > 0 ? screenshots[0] : null;

    // 旋转选项
    const rotationOptions: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];

    const handleConfirm = async () => {
        if (!videoHash) return;

        setLoading(true);
        try {

            // 2. 保存旋转配置
            await window.api.updateAnnotation(videoHash, { screenshot_rotation: selectedRotation });

            // 3. 执行导出
            showToast({ message: '配置已保存，正在导出...', type: 'info' });
            await window.api.exportScreenshots(videoHash, selectedRotation);

            showToast({ message: '截图导出成功', type: 'success' });
            onClose(); // 成功后关闭
        } catch (error) {
            console.error(error);
            showToast({ message: '导出失败', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="导出截图配置"
            size="xl"
            centered
            overlayProps={{
                backgroundOpacity: 0.55,
                blur: 3,
            }}
        >
            <Box style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 1. 顶部：旋转选择区 */}
                <Box>
                    <Text size="sm" fw={500} mb="xs">选择导出旋转角度 (预览基于第一张截图)</Text>
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
                                    transition: 'all 0.2s',
                                    position: 'relative'
                                }}
                            >
                                {selectedRotation === rot && (
                                    <Box style={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        backgroundColor: 'var(--mantine-color-blue-6)',
                                        borderRadius: '50%',
                                        width: 20,
                                        height: 20,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 2
                                    }}>
                                        <IconCheck size={14} color="white" />
                                    </Box>
                                )}

                                <Box style={{
                                    width: '100%',
                                    aspectRatio: '16/9',
                                    backgroundColor: '#000',
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {firstScreenshot ? (
                                        <img
                                            src={firstScreenshot.path}
                                            alt={`${rot}°`}
                                            style={{
                                                maxWidth: '80%',
                                                maxHeight: '80%',
                                                // 仅仅在视觉上旋转预览，不改变原图
                                                transform: `rotate(${rot}deg)`,
                                                transition: 'transform 0.3s ease'
                                            }}
                                        />
                                    ) : (
                                        <Text size="xs" c="dimmed">无预览</Text>
                                    )}
                                </Box>
                                <Text size="sm">{rot}°</Text>
                            </UnstyledButton>
                        ))}
                    </SimpleGrid>
                </Box>

                {/* 2. 中部：全量预览滚动区 */}
                <Box style={{ flex: 1, minHeight: 0 }}>
                    <Text size="sm" fw={500} mb="xs">导出预览 ({screenshots.length} 张)</Text>
                    <Box style={{
                        backgroundColor: 'var(--mantine-color-dark-8)',
                        borderRadius: 8,
                        border: '1px solid var(--mantine-color-dark-4)',
                        padding: 10
                    }}>
                        <ScrollArea h={300} type="always">
                            <SimpleGrid cols={4} spacing="sm">
                                {screenshots.map((s) => (
                                    <Box
                                        key={s.filename}
                                        style={{
                                            backgroundColor: '#000',
                                            borderRadius: 4,
                                            overflow: 'hidden',
                                            padding: 4,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            aspectRatio: '16/9'
                                        }}
                                    >
                                        <img
                                            src={s.path}
                                            alt={s.filename}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                transform: `rotate(${selectedRotation}deg)`,
                                                transition: 'transform 0.3s ease'
                                            }}
                                        />
                                    </Box>
                                ))}
                            </SimpleGrid>
                        </ScrollArea>
                    </Box>
                </Box>

                {/* 3. 底部：操作按钮 */}
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose}>取消</Button>
                    <Button onClick={handleConfirm} loading={loading}>
                        确认导出
                    </Button>
                </Group>
            </Box>
        </Modal >
    );
}