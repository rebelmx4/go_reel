/**
 * Viewport Adaptation Utilities
 * Implements three-tier viewport sizing strategy based on video resolution
 */

const MIN_VIEWPORT_HEIGHT = 720; // 720p minimum
const UI_OVERHEAD = 200; // Space for title bar, controls, etc.

export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Calculate optimal viewport size based on video dimensions and rotation
 * 
 * Strategy:
 * - < 720p: Force 720p viewport, video scales up
 * - 720p ~ Max: 1:1 original display
 * - > Max: Scale down to fit screen
 */
export function calculateViewportSize(
  videoWidth: number,
  videoHeight: number,
  rotation: number,
  screenWidth: number,
  screenHeight: number
): ViewportSize {
  // Swap dimensions if rotated 90 or 270 degrees
  let width = videoWidth;
  let height = videoHeight;
  
  if (rotation % 180 !== 0) {
    [width, height] = [height, width];
  }

  // Calculate maximum viewport size (leave room for UI)
  const maxHeight = screenHeight - UI_OVERHEAD;
  const maxWidth = screenWidth - 40; // Small padding

  // Case A: Small resolution (< 720p)
  if (height < MIN_VIEWPORT_HEIGHT) {
    const scale = MIN_VIEWPORT_HEIGHT / height;
    return {
      width: Math.min(width * scale, maxWidth),
      height: MIN_VIEWPORT_HEIGHT
    };
  }

  // Case B: Oversized resolution (> screen)
  if (height > maxHeight || width > maxWidth) {
    const scaleH = maxHeight / height;
    const scaleW = maxWidth / width;
    const scale = Math.min(scaleH, scaleW);
    
    return {
      width: width * scale,
      height: height * scale
    };
  }

  // Case C: Standard resolution (720p ~ Max)
  return { width, height };
}

/**
 * Parse skip frame configuration time string to seconds
 * Examples: "60s" -> 60, "30m" -> 1800
 */
export function parseTimeString(timeStr: string): number {
  const match = timeStr.match(/^(\d+)([sm])$/);
  if (!match) return 0;
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  return unit === 's' ? value : value * 60;
}

/**
 * Get number of segments for skip frame mode based on video duration
 */
export function getSkipFrameSegments(
  duration: number,
  config: Record<string, number>
): number {
  // Convert config keys to seconds and sort
  const thresholds = Object.entries(config)
    .map(([key, segments]) => ({
      threshold: parseTimeString(key),
      segments
    }))
    .sort((a, b) => a.threshold - b.threshold);

  // Find matching threshold (向下匹配)
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (duration >= thresholds[i].threshold) {
      return thresholds[i].segments;
    }
  }

  // Default: no skip
  return 0;
}
