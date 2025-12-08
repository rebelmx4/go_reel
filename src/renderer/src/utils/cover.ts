/**
 * Cover Management Utilities
 * Implements three-tier cover priority: Manual > Default > Generate
 */

/**
 * Get video cover following priority logic:
 * 1. Manual cover ([Hash].webp)
 * 2. Default cover ([Hash]_d.webp)
 * 3. Generate default cover at 20% position
 */
export async function getVideoCover(
  videoPath: string,
  videoHash: string
): Promise<string> {
  if (!window.api?.getCover) {
    // Fallback to generating thumbnail
    return generateDefaultCoverDataUrl(videoPath, videoHash);
  }
  
  // IPC will handle the three-tier logic
  const coverPath = await window.api.getCover(videoHash, videoPath);
  
  // If empty, generate default cover
  if (!coverPath) {
    return generateDefaultCoverDataUrl(videoPath, videoHash);
  }
  
  return `file://${coverPath}`;
}

/**
 * Generate default cover at 20% position and save it
 */
async function generateDefaultCoverDataUrl(
  videoPath: string,
  videoHash: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = `file://${videoPath}`;
    video.muted = true;
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      // Seek to 20% position
      video.currentTime = video.duration * 0.2;
    };
    
    video.onseeked = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/webp', 1.0);
        
        video.remove();
        
        // Save to file system if API available
        if (window.api?.saveCover) {
          const coverPath = await window.api.saveCover(videoHash, dataUrl, true);
          resolve(`file://${coverPath}`);
        } else {
          resolve(dataUrl);
        }
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
 * Set manual cover from screenshot
 */
export async function setManualCover(
  screenshotPath: string,
  videoHash: string
): Promise<void> {
  if (window.api?.setManualCover) {
    await window.api.setManualCover(screenshotPath, videoHash);
  }
}

/**
 * Check if screenshot is set as cover
 */
export async function isScreenshotCover(
  screenshotFilename: string,
  videoHash: string
): Promise<boolean> {
  if (window.api?.isScreenshotCover) {
    return await window.api.isScreenshotCover(screenshotFilename, videoHash);
  }
  return false;
}
