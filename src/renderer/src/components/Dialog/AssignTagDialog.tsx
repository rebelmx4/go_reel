import { useState, useCallback, useEffect, useMemo } from 'react';
import { Modal, Box, Text, TextInput, Button, Group } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useTagStore } from '../../stores/tagStore';
import { Tag } from '../../../../shared';
import { useVideoFileRegistryStore } from '../../stores/videoFileRegistryStore';
import { keyBindingManager } from '../../utils/KeyBindingManager';
import { TagCard } from '../Tag/TagCard';
import { TagFilterGrid } from '../Tag/TagFilterGrid';

interface AssignTagDialogProps {
    opened: boolean;
    onClose: () => void;
    videoPath: string; // 统一使用 path
    assignedTagIds: number[];
    // onAssign 依然保留，用于通知父组件 UI 刷新（如果父组件没有订阅 RegistryStore 的话）
    onAssign?: (tagIds: number[]) => void;
}

export function AssignTagDialog({
    opened,
    onClose,
    videoPath,
    assignedTagIds,
    onAssign
}: AssignTagDialogProps) {
    // --- 1. Store 数据与方法 ---
    const { tagsData, pinnedTags, getTagById, pinTag, unpinTag } = useTagStore();
    const updateAnnotation = useVideoFileRegistryStore(s => s.updateAnnotation);

    // --- 2. 本地会话状态 ---
    const [searchKeyword, setSearchKeyword] = useState('');
    const [sessionAssignedIds, setSessionAssignedIds] = useState<Set<number>>(new Set());

    // 当对话框打开时，同步初始状态
    useEffect(() => {
        if (opened) {
            setSessionAssignedIds(new Set(assignedTagIds));
            setSearchKeyword('');
        }
    }, [opened, assignedTagIds]);

    // --- 3. 数据计算 (Memoized) ---
    const pinnedTagObjects = useMemo(() =>
        pinnedTags
            .sort((a, b) => a.position - b.position)
            .map(p => getTagById(p.tagId))
            .filter((t): t is Tag => !!t),
        [pinnedTags, getTagById]);

    const assignedTagObjects = useMemo(() =>
        Array.from(sessionAssignedIds)
            .map(id => getTagById(id))
            .filter((t): t is Tag => !!t),
        [sessionAssignedIds, getTagById]);

    const excludedIds = useMemo(() => new Set([
        ...pinnedTags.map(p => p.tagId),
        ...Array.from(sessionAssignedIds)
    ]), [pinnedTags, sessionAssignedIds]);

    // --- 4. 逻辑处理函数 ---
    const handleToggleTag = useCallback((tagId: number) => {
        setSessionAssignedIds(prev => {
            const next = new Set(prev);
            if (next.has(tagId)) next.delete(tagId);
            else next.add(tagId);
            return next;
        });
    }, []);

    const handlePin = useCallback(async (tag: Tag) => {
        if (pinnedTags.length >= 10) return alert('常用标签栏已满');
        await pinTag(tag.id); // 内部已包含保存逻辑
    }, [pinnedTags, pinTag]);

    const handleConfirm = async () => {
        const finalIds = Array.from(sessionAssignedIds);
        // 直接更新 Registry Store，这会触发后端 files.json 的写入
        await updateAnnotation(videoPath, { tags: finalIds });
        onAssign?.(finalIds);
        onClose();
    };

    // --- 5. 快捷键集成 (KeyBindingManager) ---
    useEffect(() => {
        if (!opened) return;

        // 切换上下文
        const originalContext = keyBindingManager.getContext();
        keyBindingManager.setContext('dialog_assign_tag');

        // 注册处理器
        // 动态构建 1-10 号槽位的动作
        const handlers: Record<string, () => void> = {
            confirm: handleConfirm,
            cancel: onClose
        };

        // 映射 slot_1, slot_2 ... slot_10
        pinnedTagObjects.forEach((tag, index) => {
            handlers[`slot_${index + 1}`] = () => handleToggleTag(tag.id);
        });

        keyBindingManager.registerHandlers(handlers);

        return () => {
            keyBindingManager.setContext(originalContext);
            // 清理本次注册的所有处理器
            Object.keys(handlers).forEach(action => keyBindingManager.unregisterHandler(action));
        };
    }, [opened, pinnedTagObjects, handleToggleTag, handleConfirm, onClose]);

    // 获取 Slot 对应的快捷键名称（用于 UI 显示）
    const getSlotKeyLabel = (index: number) => {
        const bindings = keyBindingManager.getBindings();
        return bindings?.dialog_assign_tag.quick_assign_tags[`slot_${index + 1}`] || '';
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Text fw={700}>为当前视频分配标签</Text>}
            size="xl"
            styles={{
                body: { padding: 0, height: '75vh', display: 'flex', flexDirection: 'column' },
                content: { backgroundColor: '#141517' }
            }}
        >
            {/* 1. 常用标签区 (Pinned) */}
            <Box p="md" style={{ backgroundColor: '#0b0c0d', borderBottom: '1px solid #333' }}>
                <Text size="xs" fw={700} c="dimmed" mb="xs">常用标签 (拖拽标签库内容至此，或使用快捷键快速切换)</Text>
                <Box
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                        const data = e.dataTransfer.getData('application/json');
                        if (data) handlePin(JSON.parse(data));
                    }}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: 10,
                        minHeight: 100,
                        border: '1px dashed #333',
                        padding: 8,
                        borderRadius: 4
                    }}
                >
                    {pinnedTagObjects.map((tag, index) => (
                        <TagCard
                            key={tag.id}
                            tag={tag}
                            shortcutKey={getSlotKeyLabel(index)}
                            dimmed={sessionAssignedIds.has(tag.id)}
                            showRemove
                            onRemove={() => unpinTag(tag.id)}
                            onClick={() => handleToggleTag(tag.id)}
                        />
                    ))}
                    {pinnedTagObjects.length === 0 && (
                        <Box style={{ gridColumn: 'span 5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text size="xs" c="dimmed">暂无常用标签</Text>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* 2. 当前分配区 (Assigned) */}
            <Box p="md" style={{ borderBottom: '1px solid #333' }}>
                <Text size="xs" fw={700} c="dimmed" mb="xs">已分配给本视频 ({assignedTagObjects.length})</Text>
                <Group gap="xs" style={{ minHeight: 40 }}>
                    {assignedTagObjects.map(tag => (
                        <Box key={tag.id} w={120}>
                            <TagCard
                                tag={tag}
                                showRemove
                                onRemove={() => handleToggleTag(tag.id)}
                            />
                        </Box>
                    ))}
                    {assignedTagObjects.length === 0 && <Text size="xs" c="dimmed">尚未分配标签</Text>}
                </Group>
            </Box>

            {/* 3. 标签库搜索区 (Library) */}
            <Box p="md" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <TextInput
                    placeholder="🔍 搜索标签库..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.currentTarget.value)}
                    mb="md"
                    data-autofocus
                />
                <Box style={{ flex: 1 }}>
                    <TagFilterGrid
                        allTagsData={tagsData}
                        filterKeyword={searchKeyword}
                        excludedIds={excludedIds}
                        onTagClick={(tag) => handleToggleTag(tag.id)}
                        draggable
                    />
                </Box>
            </Box>

            {/* 4. 底部操作栏 */}
            <Group justify="flex-end" p="md" style={{ borderTop: '1px solid #333', backgroundColor: '#141517' }}>
                <Button variant="subtle" color="gray" onClick={onClose}>
                    取消
                </Button>
                <Button color="green" onClick={handleConfirm}>
                    确定
                </Button>
            </Group>
        </Modal>
    );
}