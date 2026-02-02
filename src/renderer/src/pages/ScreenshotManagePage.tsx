// src/renderer/src/pages/ScreenshotManagePage.tsx

import { useState, useEffect, useMemo } from 'react';
import {
    Box, SimpleGrid, Text, Group, Button,
    ActionIcon, Tooltip, Title, Stack, Checkbox,
    Paper, Center, Loader, rem
} from '@mantine/core';
import {
    IconBox, IconCompass, IconCloudDownload,
    IconTrash, IconChevronLeft, IconMinus, IconCheck
} from '@tabler/icons-react';
import { usePlaylistStore, useScreenshotStore, useNavigationStore, usePlayerStore } from '../stores';
import { ScreenshotMeta } from '../stores/screenshotStore';
import { useStoryboard } from '../hooks/useStoryboard';
import { StoryboardPreviewModal } from '../components/Storyboard/StoryboardPreviewModal';
import { IconWall } from '@tabler/icons-react';

export function ScreenshotManagePage() {
    const currentPath = usePlaylistStore(state => state.currentPath);
    const setView = useNavigationStore(state => state.setView);

    // 从 Store 获取数据和操作
    const { screenshots, isLoading, loadScreenshotData, updateScreenshotMeta, deleteBatch } = useScreenshotStore();
    const { previewUrl, setPreviewUrl, loading, generate, save } = useStoryboard(currentPath);

    // 本地交互状态
    const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
    const [aspectRatio, setAspectRatio] = useState<number>(16 / 9); // 默认横屏

    const handleSingleToggle = (screenshot: any, attr: keyof ScreenshotMeta) => {
        if (!currentPath) return;
        const currentMeta = screenshot.meta || { storyboard: true, navigation: true, export: true };
        const updates = {
            [screenshot.filename]: {
                ...currentMeta,
                [attr]: !currentMeta[attr]
            }
        };
        updateScreenshotMeta(currentPath, updates);
    };

    // 1. 初始化加载
    useEffect(() => {
        if (currentPath) {
            loadScreenshotData(currentPath);
            // 获取视频元数据以确定显示比例
            window.api.getVideoMetadata(currentPath).then(meta => {
                if (meta && meta.width && meta.height) {
                    const ratio = meta.width / meta.height;
                    // 归一化比例到 16:9, 9:16 或 1:1
                    if (ratio > 1.2) setAspectRatio(16 / 9);
                    else if (ratio < 0.8) setAspectRatio(9 / 16);
                    else setAspectRatio(1 / 1);
                }
            });
        }
    }, [currentPath]);

    // 2. 选择逻辑 (支持 Ctrl 多选)
    const handleToggleSelect = (filename: string, isCtrl: boolean) => {
        setSelectedNames(prev => {
            const next = new Set(prev);
            if (isCtrl) {
                if (next.has(filename)) next.delete(filename);
                else next.add(filename);
            } else {
                // 非 Ctrl 点击：如果是已选中的唯一一个，则取消；否则设为唯一选中
                if (next.has(filename) && next.size === 1) next.clear();
                else {
                    next.clear();
                    next.add(filename);
                }
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedNames.size === screenshots.length) setSelectedNames(new Set());
        else setSelectedNames(new Set(screenshots.map(s => s.filename)));
    };

    // 3. 批量属性计算逻辑 (三态：全选、部分选、全未选)
    const getBatchStatus = (attr: keyof ScreenshotMeta) => {
        const selectedScreens = screenshots.filter(s => selectedNames.has(s.filename));
        if (selectedScreens.length === 0) return 'none';

        const trueCount = selectedScreens.filter(s => s.meta?.[attr]).length;
        if (trueCount === selectedScreens.length) return 'all';
        if (trueCount > 0) return 'some';
        return 'none';
    };

    const handleBatchToggle = (attr: keyof ScreenshotMeta) => {
        if (selectedNames.size === 0 || !currentPath) return;

        const status = getBatchStatus(attr);
        const newValue = status !== 'all'; // 只要不是全 true，点击就全变 true；全 true 时才变 false

        const updates: Record<string, ScreenshotMeta> = {};
        screenshots.forEach(s => {
            if (selectedNames.has(s.filename)) {
                updates[s.filename] = { ...s.meta!, [attr]: newValue };
            }
        });

        updateScreenshotMeta(currentPath, updates);
    };

    const handleDeleteSelected = () => {
        if (selectedNames.size === 0 || !currentPath) return;
        deleteBatch(currentPath, Array.from(selectedNames));
        setSelectedNames(new Set());
    };

    // 4. 样式计算
    const gridCols = useMemo(() => {
        if (aspectRatio < 1) return { base: 3, sm: 4, md: 6, lg: 8 }; // 竖屏
        return { base: 1, sm: 2, md: 3, lg: 4 }; // 横屏
    }, [aspectRatio]);

    if (!currentPath) return <Center h="100%"><Text c="dimmed">未选择视频</Text></Center>;
    if (isLoading) return <Center h="100%"><Loader color="blue" /></Center>;

    return (
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#101113' }}>

            {/* 顶部工具栏 (Sticky) */}
            <Paper p="md" shadow="md" style={{ zIndex: 10, backgroundColor: 'var(--mantine-color-dark-7)' }} radius={0}>
                <Group justify="space-between">
                    <Group>
                        <ActionIcon variant="subtle" onClick={() => setView('player_page')}>
                            <IconChevronLeft size={20} />
                        </ActionIcon>
                        <Title order={4}>截图管理</Title>
                        <Text size="sm" c="dimmed">已选中 {selectedNames.size} 张</Text>
                    </Group>

                    <Group gap="xs">
                        <Button
                            variant="gradient"
                            gradient={{ from: 'indigo', to: 'cyan' }}
                            leftSection={<IconWall size={16} />}
                            onClick={generate}
                            loading={loading}
                        >
                            生成照片墙
                        </Button>

                        <Button variant="default" size="xs" onClick={handleSelectAll}>
                            {selectedNames.size === screenshots.length ? '取消全选' : '全选'}
                        </Button>

                        <AttributeToggleButton
                            label="故事板"
                            icon={<IconBox size={16} />}
                            status={getBatchStatus('storyboard')}
                            onClick={() => handleBatchToggle('storyboard')}
                            color="violet"
                        />
                        <AttributeToggleButton
                            label="导航器"
                            icon={<IconCompass size={16} />}
                            status={getBatchStatus('navigation')}
                            onClick={() => handleBatchToggle('navigation')}
                            color="blue"
                        />
                        <AttributeToggleButton
                            label="导出项"
                            icon={<IconCloudDownload size={16} />}
                            status={getBatchStatus('export')}
                            onClick={() => handleBatchToggle('export')}
                            color="green"
                        />

                        <Button
                            leftSection={<IconTrash size={16} />}
                            color="red"
                            size="xs"
                            disabled={selectedNames.size === 0}
                            onClick={handleDeleteSelected}
                        >
                            删除
                        </Button>
                    </Group>
                </Group>
            </Paper>

            {/* 截图网格区域 */}
            <Box style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                <SimpleGrid cols={gridCols} spacing="lg">
                    {screenshots.map((s) => (
                        <ScreenshotManageCard
                            key={s.filename}
                            screenshot={s}
                            aspectRatio={aspectRatio}
                            isSelected={selectedNames.has(s.filename)}
                            onClick={(e) => handleToggleSelect(s.filename, e.ctrlKey || e.metaKey)}
                            // [新增] 传入单项切换回调
                            onAttributeToggle={(attr: keyof ScreenshotMeta) => handleSingleToggle(s, attr)}
                        />
                    ))}
                </SimpleGrid>
            </Box>

            <StoryboardPreviewModal
                url={previewUrl}
                loading={loading}
                onCancel={() => setPreviewUrl(null)}
                onRegenerate={generate}
                onSave={save}
            />

            {/* 注入 CSS 处理 ActionIcon 的悬浮效果 */}
            <style>{`
                .screenshot-manage-icon:hover {
                transform: scale(1.15) !important;
                background-color: rgba(255, 255, 255, 0.25) !important;
                }
                
                /* 如果是激活状态，悬浮时稍微加深颜色 */
                .screenshot-manage-icon[data-variant="filled"]:hover {
                filter: brightness(1.1);
                }
            `}</style>
        </Box>
    );
}



// --- 子组件：三态开关按钮 ---
function AttributeToggleButton({ label, icon, status, onClick, color }: any) {
    const isAll = status === 'all';
    const isSome = status === 'some';

    return (
        <Tooltip label={label}>
            <Button
                size="xs"
                variant={isAll || isSome ? 'filled' : 'light'}
                color={isAll || isSome ? color : 'gray'}
                leftSection={isSome ? <IconMinus size={14} /> : (isAll ? <IconCheck size={14} /> : icon)}
                onClick={onClick}
                disabled={status === 'none' && onClick === undefined}
            >
                {label}
            </Button>
        </Tooltip>
    );
}

function ScreenshotManageCard({ screenshot, aspectRatio, isSelected, onClick, onAttributeToggle }: any) {
    return (
        <Paper
            shadow="sm"
            radius="md"
            onClick={onClick}
            style={{
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden',
                aspectRatio: aspectRatio,
                border: `3px solid ${isSelected ? 'var(--mantine-color-blue-filled)' : 'transparent'}`,
                transition: 'all 0.1s ease',
                backgroundColor: '#000',
                // 增加阴影让卡片更有立体感
                boxShadow: isSelected ? '0 0 15px rgba(34, 139, 230, 0.4)' : 'none'
            }}
        >
            <img
                src={screenshot.path}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: isSelected ? 0.7 : 1,
                    transition: 'opacity 0.2s'
                }}
                alt="screenshot"
            />

            {/* 选中时的蓝色蒙层 */}
            {isSelected && (
                <Box style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(34, 139, 230, 0.1)',
                    pointerEvents: 'none'
                }} />
            )}

            {/* [重构] 底部属性状态指示器：改为更大的按钮组 */}
            <Box
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '8px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                    display: 'flex',
                    justifyContent: 'center', // 居中显示，方便点击
                    gap: rem(12),
                    zIndex: 5
                }}
                // 关键：阻止点击图标时选中卡片
                onClick={(e) => e.stopPropagation()}
            >
                <InteractiveStatusIcon
                    active={screenshot.meta?.storyboard}
                    color="violet"
                    icon={<IconBox size={20} />}
                    label="故事板"
                    onClick={() => onAttributeToggle('storyboard')}
                />
                <InteractiveStatusIcon
                    active={screenshot.meta?.navigation}
                    color="blue"
                    icon={<IconCompass size={20} />}
                    label="导航器"
                    onClick={() => onAttributeToggle('navigation')}
                />
                <InteractiveStatusIcon
                    active={screenshot.meta?.export}
                    color="green"
                    icon={<IconCloudDownload size={20} />}
                    label="导出项"
                    onClick={() => onAttributeToggle('export')}
                />
            </Box>

            {/* 多选框预览 */}
            <Box style={{ position: 'absolute', top: 8, left: 8 }}>
                <Checkbox
                    checked={isSelected}
                    readOnly
                    size="sm"
                    tabIndex={-1}
                    styles={{ input: { cursor: 'pointer' } }}
                />
            </Box>
        </Paper>
    );
}

// --- [新增] 子组件：可交互的角标图标 ---
function InteractiveStatusIcon({ active, color, icon, label, onClick }: any) {
    return (
        <Tooltip label={label} openDelay={500} withinPortal>
            <ActionIcon
                size="lg"
                radius="xl"
                variant={active ? 'filled' : 'subtle'}
                color={active ? color : 'gray'}
                onClick={onClick}
                // 添加一个类名用于 CSS 悬浮效果
                className="screenshot-manage-icon"
                style={{
                    // 这里的变量会根据 active 状态切换
                    backgroundColor: active ? undefined : 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(4px)',
                    transition: 'transform 0.1s ease, background-color 0.2s ease',
                    boxShadow: active ? '0 4px 8px rgba(0,0,0,0.3)' : 'none',
                    border: 'none'
                }}
            >
                {icon}
            </ActionIcon>
        </Tooltip>
    );
}
