/**
 * Generate thumbnail from video file
 */
export const generateThumbnail = async (videoPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = `file://${videoPath}`;
    video.muted = true;

    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% of duration, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const targetWidth = 320;
        const targetHeight = 180;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        // Convert to WebP data URL with quality 1.0 (100%)
        const dataUrl = canvas.toDataURL('image/webp', 1.0);

        // Clean up
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
};

/**
 * Generate thumbnail with retry logic
 */
export const generateThumbnailWithRetry = async (
  videoPath: string,
  maxRetries = 3
): Promise<string | null> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateThumbnail(videoPath);
    } catch (error) {
      console.warn(`Thumbnail generation attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        console.error('Failed to generate thumbnail after retries');
        return null;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return null;
};
