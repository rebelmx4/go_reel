/**
 * Screenshot Utilities
 * Implements auto-generation, manual screenshots, and cover management
 */

export interface Screenshot {
  filename: string;
  timestamp: number; // milliseconds
  path: string;
  type: 'manual' | 'auto'; // _m or _a
  isCover?: boolean;
}

/**
 * Capture screenshot with rotation applied
 * Used for export functionality
 */
export function captureRotatedScreenshot(
  video: HTMLVideoElement,
  rotation: number
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Swap dimensions for 90/270 degree rotation
  if (rotation === 90 || rotation === 270) {
    canvas.width = video.videoHeight;
    canvas.height = video.videoWidth;
  } else {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  
  // Apply rotation
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
  
  return canvas.toDataURL('image/webp', 1.0);
}
