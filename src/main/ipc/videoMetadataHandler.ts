/**
 * Video Metadata IPC Handler
 * Extracts video metadata including framerate using ffprobe
 */

import { ipcMain } from 'electron';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffprobePath } from 'ffprobe-static';
import log from 'electron-log';

// Set ffprobe path
// Note: ffmpeg-static might also be used in the related export service,
// but for metadata usually ffprobe is enough.
// We make sure paths are set.
if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath);
} else {
    log.error('ffprobe-static path is missing');
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  framerate: number;
}

/**
 * Get video metadata using fluent-ffmpeg
 */
function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        log.error('Failed to get video metadata:', err);
        // We could resolve default values or reject. 
        // original code returned defaults on error (log only).
        // Let's stick to original behavior but log deeply.
        // Actually, returning defaults is safer for UI not to crash.
        return resolve({
            duration: 0,
            width: 0,
            height: 0,
            framerate: 30
        });
      }

      const stream = metadata.streams.find(s => s.codec_type === 'video');
      
      if (!stream) {
        log.warn('No video stream found');
        return resolve({
            duration: 0,
            width: 0,
            height: 0,
            framerate: 30
        });
      }

      // Parse framerate
      let framerate = 30;
      if (stream.r_frame_rate) {
        const [num, den] = stream.r_frame_rate.split('/').map(Number);
        if (den !== 0) {
            framerate = num / den;
        }
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: stream.width || 0,
        height: stream.height || 0,
        framerate: Math.round(framerate * 1000) / 1000
      });
    });
  });
}

/**
 * Register video metadata IPC handler
 */
export function registerVideoMetadataHandler() {
  ipcMain.handle('get-video-metadata', async (_, videoPath: string) => {
    return await getVideoMetadata(videoPath);
  });
}
