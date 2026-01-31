import { Box } from '@mantine/core';
import { usePlayerStore, usePlaylistStore, useVideoFileRegistryStore, useTagStore } from '../stores';
import { TagCard } from '../components/Tag/TagCard';
import { Tag } from '../../../shared';

export function ViewportTagOverlay() {
    const showViewportTags = usePlayerStore(state => state.showViewportTags);
    const currentPath = usePlaylistStore(state => state.currentPath);
    const getTagById = useTagStore(state => state.getTagById);

    // 获取当前视频的标签 ID 列表
    const videoFile = useVideoFileRegistryStore(s => currentPath ? s.videos[currentPath] : null);
    const tagIds = videoFile?.annotation?.tags || [];

    if (!showViewportTags || tagIds.length === 0) return null;

    // 将 ID 转换为完整的 Tag 对象
    const tags = tagIds
        .map(id => getTagById(id))
        .filter((t): t is Tag => !!t);

    return (
        <Box
            style={{
                position: 'absolute',
                top: 20,
                left: 20,
                bottom: 20, // 限制高度，触发换列
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column', // 纵向排列
                flexWrap: 'wrap',        // 自动换列
                alignContent: 'flex-start',
                gap: 12,
                pointerEvents: 'none',   // 允许鼠标事件穿透到下方的视频层
                userSelect: 'none'
            }}
        >
            {tags.map(tag => (
                <Box key={tag.id} style={{ width: 140 }}> {/* 固定宽度防止图片撑开不一 */}
                    <TagCard tag={tag} />
                </Box>
            ))}
        </Box>
    );
}