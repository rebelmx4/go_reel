// src/renderer/src/pages/FolderPage.tsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text, ScrollArea, Group, Button, Stack, Tree, useTree, Divider } from '@mantine/core';
import { IconFolder, IconTag, IconCheck, IconX } from '@tabler/icons-react';
import {
    useVideoFileRegistryStore,
    useNavigationStore,
    usePlaylistStore
} from '../stores';
import { VideoGrid } from '../components/Video/VideoGrid';
import { buildFolderTree, getShallowestVideoFolder, dirname } from '../utils/pathUtils';
import { VideoFile } from '../../../shared/models';
import { BatchAssignTagDialog } from '../components/Dialog/BatchAssignTagDialog';

export function FolderPage() {
    // --- 1. Store 数据 ---
    const { videos, videoPaths } = useVideoFileRegistryStore();
    const setView = useNavigationStore((s) => s.setView);
    const jumpTo = usePlaylistStore((s) => s.jumpTo);

    // --- 2. 本地状态 ---
    const [videoSource, setVideoSource] = useState<string>('');
    const [activeFolder, setActiveFolder] = useState<string | null>(null);
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
    const [anchorIndex, setAnchorIndex] = useState<number | null>(null); // 用于 Shift 连选
    const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);

    // --- 3. 初始化：获取路径配置 ---
    useEffect(() => {
        window.api.getPathOverview().then(res => {
            setVideoSource(res.video_source);
            // 初始定位到最浅的包含视频的目录
            const shallowest = getShallowestVideoFolder(videoPaths, res.video_source);
            setActiveFolder(shallowest);
        });
    }, [videoPaths]);

    // --- 4. 树逻辑 (Mantine Tree) ---
    const treeData = useMemo(() =>
        buildFolderTree(videoPaths, videoSource),
        [videoPaths, videoSource]
    );

    const tree = useTree();

    // --- 5. 视频过滤 logic ---
    const currentVideos = useMemo(() => {
        if (!activeFolder) return [];
        // 过滤出当前层级的视频，并保持 videoPaths 的原始排序
        return videoPaths
            .filter(path => dirname(path) === activeFolder)
            .map(path => videos[path]);
    }, [activeFolder, videoPaths, videos]);

    // --- 6. 多选交互逻辑 ---
    const handleSelect = useCallback((index: number, e: React.MouseEvent) => {
        const targetPath = currentVideos[index].path;
        const newSelected = new Set(selectedPaths);

        if (e.ctrlKey || e.metaKey) {
            // Ctrl + 点击：反转选中
            if (newSelected.has(targetPath)) newSelected.delete(targetPath);
            else newSelected.add(targetPath);
            setAnchorIndex(index);
        }
        else if (e.shiftKey && anchorIndex !== null) {
            // Shift + 点击：连选
            const start = Math.min(anchorIndex, index);
            const end = Math.max(anchorIndex, index);
            for (let i = start; i <= end; i++) {
                newSelected.add(currentVideos[i].path);
            }
        }
        else {
            // 普通点击：单选
            newSelected.clear();
            newSelected.add(targetPath);
            setAnchorIndex(index);
        }

        setSelectedPaths(newSelected);
    }, [currentVideos, selectedPaths, anchorIndex]);

    const handleClearSelection = () => {
        setSelectedPaths(new Set());
        setAnchorIndex(null);
    };

    const handleSelectAll = () => {
        setSelectedPaths(new Set(currentVideos.map(v => v.path)));
    };

    // --- 7. 播放控制 ---
    const handlePlay = (video: VideoFile) => {
        // 跳转播放，模式传空（保持原有模式）
        jumpTo(video.path);
        setView('player_page');
    };

    // 获取选中的文件对象数组
    const selectedVideoFiles = useMemo(() =>
        Array.from(selectedPaths).map(p => videos[p]).filter(v => !!v),
        [selectedPaths, videos]
    );

    return (
        <Box style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* 左侧：文件夹树 */}
            <Box style={{
                width: 300,
                borderRight: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#111'
            }}>
                <Box p="md">
                    <Text fw={700} size="sm">文件夹预览</Text>
                    <Text size="xs" c="dimmed">仅显示包含视频的目录</Text>
                </Box>
                <Divider />
                <ScrollArea style={{ flex: 1 }} p="xs">
                    <Tree
                        data={treeData}
                        tree={tree}
                        levelOffset={20}
                        // 1. 移除这里的 onNodeClick
                        renderNode={({ node, expanded, hasChildren, elementProps }) => (
                            <Group
                                gap={5}
                                {...elementProps}
                                // 2. 将点击逻辑移到这里
                                onClick={() => {
                                    setActiveFolder(node.value);
                                    handleClearSelection();
                                }}
                                style={{
                                    ...elementProps.style,
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    backgroundColor: activeFolder === node.value ? 'rgba(34, 139, 230, 0.15)' : 'transparent',
                                    color: activeFolder === node.value ? '#339af0' : '#eee'
                                }}
                            >
                                <IconFolder
                                    size={16}
                                    style={{ opacity: hasChildren ? 1 : 0.5 }}
                                    fill={activeFolder === node.value ? 'currentColor' : 'none'}
                                />
                                <Text size="sm" truncate>{node.label}</Text>
                            </Group>
                        )}
                    />
                </ScrollArea>
            </Box>

            {/* 右侧：视频展示区 */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}>
                {/* 顶部工具栏 */}
                <Box p="md" style={{ borderBottom: '1px solid #333', backgroundColor: '#141517' }}>
                    <Group justify="space-between">
                        <Stack gap={0}>
                            {/* 3. 将 maxW 修正为 maw */}
                            <Text size="sm" fw={700} truncate maw={400}>
                                {activeFolder ? activeFolder.split('/').pop() : '未选择文件夹'}
                            </Text>
                            <Text size="xs" c="dimmed">{currentVideos.length} 个视频</Text>
                        </Stack>

                        <Group gap="xs">
                            {selectedPaths.size > 0 && (
                                <>
                                    <Text size="xs" c="blue.4" fw={700}>已选中 {selectedPaths.size} 项</Text>
                                    <Button
                                        size="xs"
                                        variant="filled"
                                        color="blue"
                                        leftSection={<IconTag size={14} />}
                                        onClick={() => setIsTagDialogOpen(true)}
                                    >
                                        批量打标签
                                    </Button>
                                    <Button size="xs" variant="subtle" color="gray" onClick={handleClearSelection}>
                                        取消选择
                                    </Button>
                                </>
                            )}
                            <Button size="xs" variant="outline" color="gray" onClick={handleSelectAll}>
                                全选
                            </Button>
                        </Group>
                    </Group>
                </Box>

                {/* 视频列表 */}
                <ScrollArea style={{ flex: 1 }}>
                    <VideoGrid
                        videos={currentVideos}
                        selectedPaths={selectedPaths}
                        onSelect={handleSelect}
                        onPlay={handlePlay}
                        emptyMessage={activeFolder ? "当前目录下无视频，请查看子目录" : "请在左侧选择文件夹"}
                    />
                </ScrollArea>
            </Box>

            {/* 批量打标签对话框 */}
            <BatchAssignTagDialog
                opened={isTagDialogOpen}
                onClose={() => setIsTagDialogOpen(false)}
                selectedVideos={selectedVideoFiles}
            />
        </Box>
    );
}