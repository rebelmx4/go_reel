import { VideoProvider } from './contexts'
import { VideoPlayerContent } from './VideoPlayerContent'

export const VideoPlayer = () => {
  return (
    <VideoProvider>
      <VideoPlayerContent />
    </VideoProvider>
  )
}
