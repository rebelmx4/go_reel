import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

/**
 * Configures fluent-ffmpeg to use the static binaries from node_modules.
 * This function should be called once at the start of the application.
 */
export function setupFfmpeg() {
  if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
    console.log('FFMpeg static path set.');
  } else {
    console.error('ffmpeg-static not found, fluent-ffmpeg might not work.');
  }
  
  if (ffprobeStatic) {
    ffmpeg.setFfprobePath(ffprobeStatic.path);
    console.log('FFprobe static path set.');
  } else {
    console.error('ffprobe-static not found, ffprobe will not work.');
  }
}