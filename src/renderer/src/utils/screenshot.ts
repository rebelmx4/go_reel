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
 * Capture raw screenshot from video element
 * Returns WebP data URL at original resolution
 */
export function captureRawScreenshot(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Convert to WebP with quality 1.0 (100%)
  return canvas.toDataURL('image/webp', 1.0);
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

/**
 * Capture frame at specific time
 */
export async function captureFrameAt(
  videoPath: string,
  time: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = `file://${videoPath}`;
    video.muted = true;
    
    video.onloadedmetadata = () => {
      video.currentTime = time;
    };
    
    video.onseeked = () => {
      try {
        const dataUrl = captureRawScreenshot(video);
        video.remove();
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };
  });
}

/**
 * Generate 9 auto screenshots at equal intervals
 */
export async function generateAutoScreenshots(
  videoPath: string,
  duration: number,
  videoHash: string
): Promise<void> {
  const interval = duration / 10;
  const screenshots: Array<{ timestamp: number; dataUrl: string }> = [];
  
  // Generate screenshots at positions 1-9 (skip 0 and 10)
  for (let i = 1; i <= 9; i++) {
    const time = i * interval;
    const dataUrl = await captureFrameAt(videoPath, time);
    const timestamp = Math.floor(time * 1000);
    screenshots.push({ timestamp, dataUrl });
  }
  
  // Save all screenshots via IPC
  if (window.api?.saveScreenshots) {
    await window.api.saveScreenshots(videoHash, screenshots, 'auto');
  }
}

/**
 * Save manual screenshot
 */
export async function saveManualScreenshot(
  video: HTMLVideoElement,
  videoHash: string
): Promise<void> {
  const dataUrl = captureRawScreenshot(video);
  const timestamp = Math.floor(video.currentTime * 1000);
  
  if (window.api?.saveScreenshots) {
    await window.api.saveScreenshots(videoHash, [{ timestamp, dataUrl }], 'manual');
  }
}

/**
 * Load screenshots for a video
 */
export async function loadScreenshots(videoHash: string): Promise<Screenshot[]> {
  if (window.api?.loadScreenshots) {
    return await window.api.loadScreenshots(videoHash);
  }
  return [];
}

/**
 * Delete screenshot
 */
export async function deleteScreenshot(
  videoHash: string,
  filename: string
): Promise<void> {
  if (window.api?.deleteScreenshot) {
    await window.api.deleteScreenshot(videoHash, filename);
  }
}

/**
 * Parse screenshot filename
 */
export function parseScreenshotFilename(filename: string): {
  timestamp: number;
  type: 'manual' | 'auto';
} | null {
  const match = filename.match(/^(\d+)_(m|a)\.webp$/);
  if (!match) return null;
  
  return {
    timestamp: parseInt(match[1], 10),
    type: match[2] === 'm' ? 'manual' : 'auto'
  };
}
