import path from 'path'

/**
 * Supported video file extensions
 */
const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mkv',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
  '.m4v',
  '.mpg',
  '.mpeg',
  '.3gp',
  '.ts',
  '.mts',
  '.m2ts'
])

/**
 * Check if a file is a video based on extension
 * @param filePath Path to file
 * @returns True if file is a video
 */
export function isVideoFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return VIDEO_EXTENSIONS.has(ext)
}

/**
 * Get all supported video extensions
 * @returns Array of supported extensions (with dot)
 */
export function getSupportedExtensions(): string[] {
  return Array.from(VIDEO_EXTENSIONS)
}
