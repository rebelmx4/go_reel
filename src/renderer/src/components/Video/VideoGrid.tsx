import { Box, Text } from '@mantine/core'
import { VideoFile } from '../../../../shared'
import { VideoCard } from './VideoCard'

interface VideoGridProps {
  videos: VideoFile[]
  showFilenameTip?: boolean
  selectedPaths?: Set<string> // 新增
  onSelect?: (index: number, event: React.MouseEvent) => void // 新增
  onPlay: (video: VideoFile) => void
  onToggleLike?: (video: VideoFile) => void
  onToggleElite?: (video: VideoFile) => void
  emptyMessage?: string
}

export function VideoGrid({
  videos,
  selectedPaths,
  onSelect,
  onPlay,
  onToggleLike,
  onToggleElite,
  emptyMessage = '暂无视频'
}: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 400
        }}
      >
        <Text c="dimmed" size="lg">
          {emptyMessage}
        </Text>
      </Box>
    )
  }

  return (
    <Box
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: 16,
        padding: 20
      }}
    >
      {videos.map((video, index) => (
        <VideoCard
          key={video.path}
          video={video}
          isSelected={!!selectedPaths?.has(video.path)}
          onClick={(e) => onSelect?.(index, e)}
          onPlay={onPlay}
          onToggleLike={onToggleLike}
          onToggleElite={onToggleElite}
        />
      ))}
    </Box>
  )
}
