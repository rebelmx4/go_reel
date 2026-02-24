// src/components/Player/ViewportTagOverlay.tsx

import { Box } from '@mantine/core'
import { usePlayerStore, usePlaylistStore, useTagStore, useVideoFileRegistryStore } from '../stores'
import { TagCard } from '../components/Tag/TagCard'
import { Tag } from '../../../shared'

export function ViewportTagOverlay() {
  // --- 1. Store 数据与方法 ---
  const showViewportTags = usePlayerStore((state) => state.showViewportTags)
  const handleSidebarTabClick = usePlayerStore((state) => state.handleSidebarTabClick)

  const currentPath = usePlaylistStore((state) => state.currentPath)

  const { getTagById, setSidebarFilterTagId } = useTagStore()

  const videoFile = useVideoFileRegistryStore((s) => (currentPath ? s.videos[currentPath] : null))
  const updateAnnotation = useVideoFileRegistryStore((s) => s.updateAnnotation)

  const tagIds = videoFile?.annotation?.tags || []

  if (!showViewportTags || tagIds.length === 0) return null

  // --- 2. 交互处理函数 ---

  /** 点击标签：跳转到侧边栏搜索视图 */
  const handleTagClick = (tag: Tag) => {
    // 设置搜索条件
    setSidebarFilterTagId(tag.id)
    // 强制打开侧边栏并切换到 'tag_search' 选项卡
    handleSidebarTabClick('tag_search')
  }

  /** 删除标签：取消该标签与当前视频的关联 */
  const handleRemoveTag = (tag: Tag) => {
    if (!currentPath) return

    // 过滤掉当前要删除的 ID
    const newTags = tagIds.filter((id) => id !== tag.id)

    // 调用 store 进行乐观更新和持久化
    updateAnnotation(currentPath, { tags: newTags })
  }

  // 将 ID 转换为完整的 Tag 对象
  const tags = tagIds.map((id) => getTagById(id)).filter((t): t is Tag => !!t)

  return (
    <Box
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        bottom: 20,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        gap: 12,
        // [CRITICAL] 允许鼠标事件穿透到下方的视频层（针对空白区域）
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    >
      {tags.map((tag) => (
        <Box
          key={tag.id}
          style={{
            width: 140,
            // [CRITICAL] 恢复标签卡片自身的鼠标事件，使其可被点击/删除
            pointerEvents: 'auto'
          }}
        >
          <TagCard
            tag={tag}
            showRemove={true} // 悬浮层始终显示删除按钮
            onClick={handleTagClick}
            onRemove={handleRemoveTag}
          />
        </Box>
      ))}
    </Box>
  )
}
