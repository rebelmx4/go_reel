/**
 * Skip frame configuration from settings.json
 */
export interface SkipFrameConfig {
  '60s': number // Videos <= 60s
  '30m': number // Videos <= 30min
  '120m': number // Videos <= 120min
  '10000m': number // Videos > 120min
}

/**
 * Calculate segment times for skip frame playback
 */
export const calculateSkipFrameSegments = (
  duration: number,
  config: SkipFrameConfig
): number[] | null => {
  const minutes = duration / 60

  let segments = 0
  if (minutes <= 1) {
    segments = config['60s']
  } else if (minutes <= 30) {
    segments = config['30m']
  } else if (minutes <= 120) {
    segments = config['120m']
  } else {
    segments = config['10000m']
  }

  // If segments is 0, don't use skip frame mode
  if (segments === 0) return null

  // Calculate segment interval
  const interval = duration / segments

  // Generate segment times
  return Array.from({ length: segments }, (_, i) => i * interval)
}

/**
 * Default skip frame configuration
 */
export const DEFAULT_SKIP_FRAME_CONFIG: SkipFrameConfig = {
  '60s': 0, // 60秒以下，不跳帧
  '30m': 10, // 30分钟以下，10段
  '120m': 30, // 120分钟以下，30段
  '10000m': 60 // 更长视频，60段
}

/**
 * Default skip duration (seconds to pause at each segment)
 */
export const DEFAULT_SKIP_DURATION = 2
