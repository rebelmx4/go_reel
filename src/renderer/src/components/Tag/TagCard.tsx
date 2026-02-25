import { Box, Image, Text, Tooltip } from '@mantine/core'
import { Tag } from '../../../../shared/models'
import { toFileUrl } from '../../utils/pathUtils'

interface TagCardProps {
  tag: Tag
  onClick?: (tag: Tag) => void
  onRemove?: (tag: Tag) => void
  draggable?: boolean
  onDragStart?: (tag: Tag) => void
  showRemove?: boolean
  dimmed?: boolean
  shortcutKey?: string
  borderColor?: string
  hoverBorderColor?: string
}

export function TagCard({
  tag,
  onClick,
  onRemove,
  draggable = false,
  onDragStart,
  showRemove = false,
  dimmed = false,
  borderColor = '#333', // 默认是暗色边框
  hoverBorderColor = '#00ff00', // 默认 hover 是绿色
  shortcutKey
}: TagCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(tag))
    onDragStart?.(tag)
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove?.(tag)
  }

  return (
    <Tooltip
      label={tag.description || tag.keywords}
      disabled={!tag.description}
      position="top"
      openDelay={500}
    >
      <Box
        draggable={draggable}
        onDragStart={handleDragStart}
        onClick={() => onClick?.(tag)}
        style={{
          position: 'relative', // 基准定位
          cursor: onClick || draggable ? 'pointer' : 'default',
          borderRadius: 6,
          overflow: 'hidden',
          border: borderColor !== '#333' ? `2px solid ${borderColor}` : `1px solid ${borderColor}`,
          transition: 'all 0.15s ease',
          opacity: dimmed ? 0.4 : 1,
          backgroundColor: '#1a1a1a',
          userSelect: 'none',
          height: 90 // 固定高度，让文字能浮在底部
        }}
        onMouseEnter={(e) => {
          if (onClick || draggable) {
            e.currentTarget.style.borderColor = hoverBorderColor
            e.currentTarget.style.boxShadow = `0 0 8px ${hoverBorderColor}33` // 33 是透明度
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = borderColor
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {/* 快捷键标识 */}
        {shortcutKey && (
          <Box
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              backgroundColor: 'rgba(0, 255, 0, 0.8)',
              color: '#000',
              padding: '1px 5px',
              borderRadius: 3,
              fontSize: 10,
              fontWeight: 800,
              zIndex: 12,
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            {shortcutKey}
          </Box>
        )}

        {/* 描述信息指示器 */}
        {tag.description && (
          <Box
            style={{
              position: 'absolute',
              top: 6,
              right: showRemove ? 24 : 6, // 如果有删除按钮，向左移一点
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#339af0',
              zIndex: 12
            }}
          />
        )}

        {/* 删除按钮 */}
        {showRemove && (
          <Box
            onClick={handleRemoveClick}
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: '#ff4d4f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 'bold',
              cursor: 'pointer',
              zIndex: 13,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)')}
          >
            ⓧ
          </Box>
        )}

        {/* 封面图片 - 铺满整个容器 */}
        <Image
          src={toFileUrl(tag.imagePath)}
          alt={tag.keywords}
          fit="cover" // 改为 cover 使其填满背景
          height="100%"
          width="100%"
          fallbackSrc="https://placehold.co/160x90/1a1a1a/666?text=No+Image"
        />

        {/* 关键词文本区 - 绝对定位浮层 */}
        <Box
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '2px 6px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)', // 黑色半透明底
            backdropFilter: 'blur(2px)', // 模糊效果（可选，增加质感）
            zIndex: 11
          }}
        >
          <Text
            size="xs"
            fw={600}
            truncate
            style={{
              color: '#fff', // 白色文字在深色背景上更清晰
              textAlign: 'center',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)' // 添加文字阴影防止在亮色图片下看不清
            }}
          >
            {tag.keywords}
          </Text>
        </Box>
      </Box>
    </Tooltip>
  )
}
