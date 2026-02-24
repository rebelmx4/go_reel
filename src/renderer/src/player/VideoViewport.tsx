import { Box } from '@mantine/core'
import { usePlayerStore } from '../stores'
import { usePlayerActions, useVideoVisuals } from './hooks'
import { useVideoContext } from './contexts'
import { ViewportTagOverlay } from './ViewportTagOverlay'
import { StoryboardStartOverlay } from './StoryboardStartOverlay'
import { useVideoFileRegistryStore } from '@renderer/stores'

interface VideoViewportProps {
  videoSrc: string
  onTimeUpdate: (time: number) => void
}

export function VideoViewport({ videoSrc, onTimeUpdate }: VideoViewportProps) {
  const { videoRef, containerRef } = useVideoContext()
  const { rotation, setPlaying, setDuration } = usePlayerStore()
  const { togglePlayPause } = usePlayerActions()
  const videoFile = useVideoFileRegistryStore((s) => s.videos[videoSrc])
  const version = videoFile?.version
  const finalSrc = version
    ? `file://${videoSrc.replace(/\\/g, '/')}?v=${version}`
    : `file://${videoSrc.replace(/\\/g, '/')}`

  const { videoStyle, handleWheel, onVisualLoadedMetadata } = useVideoVisuals({ rotation })

  const handleVideoPlay = () => setPlaying(true)
  const handleVideoPause = () => setPlaying(false)

  return (
    <Box
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
        backgroundColor: 'black'
      }}
      onDoubleClick={togglePlayPause}
      onWheel={handleWheel} // 绑定滚轮事件
    >
      <StoryboardStartOverlay />

      <video
        ref={videoRef}
        src={finalSrc}
        style={videoStyle}
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
        onTimeUpdate={() => onTimeUpdate(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => {
          setDuration(videoRef.current?.duration || 0)
          onVisualLoadedMetadata()
          setPlaying(true)
          videoRef.current?.play().catch((err) => {
            console.warn('自动播放被浏览器拦截或失败:', err)
            setPlaying(false)
          })
        }}
      />

      <ViewportTagOverlay />
    </Box>
  )
}
