/**
 * Shared Path Utilities
 * Pure JavaScript implementation - works in both renderer and main processes
 * No Node.js dependencies
 */

/**
 * Get filename from full path
 * Works with both forward and backward slashes
 */
export function getFilename(filePath: string): string {
  if (!filePath) return '';
  
  // Replace backslashes with forward slashes for consistency
  const normalized = filePath.replace(/\\/g, '/');
  
  // Get the last segment after the last slash
  const parts = normalized.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Alias for getFilename
 */
export function basename(filePath: string): string {
  return getFilename(filePath);
}

/**
 * Get directory from full path
 */
export function getDirectory(filePath: string): string {
  if (!filePath) return '';
  
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  parts.pop(); // Remove filename
  return parts.join('/') || '/';
}

/**
 * Alias for getDirectory
 */
export function dirname(filePath: string): string {
  return getDirectory(filePath);
}

/**
 * Get file extension (including the dot)
 */
export function getExtension(filePath: string): string {
  const filename = getFilename(filePath);
  const lastDot = filename.lastIndexOf('.');
  
  if (lastDot === -1 || lastDot === 0) return '';
  return filename.slice(lastDot);
}

/**
 * Alias for getExtension
 */
export function extname(filePath: string): string {
  return getExtension(filePath);
}

/**
 * Get filename without extension
 */
export function getFilenameWithoutExt(filePath: string): string {
  const filename = getFilename(filePath);
  const ext = getExtension(filePath);
  return ext ? filename.slice(0, -ext.length) : filename;
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
  return segments
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/') // Remove duplicate slashes
    .replace(/\\/g, '/'); // Normalize to forward slashes
}

/**
 * Alias for joinPath
 */
export function join(...segments: string[]): string {
  return joinPath(...segments);
}

/**
 * Normalize path (remove . and .., convert backslashes)
 */
export function normalizePath(filePath: string): string {
  if (!filePath) return '';
  
  // Convert backslashes to forward slashes
  let normalized = filePath.replace(/\\/g, '/');
  
  // Split into parts
  const parts = normalized.split('/');
  const result: string[] = [];
  
  for (const part of parts) {
    if (part === '.' || part === '') {
      // Skip current directory and empty parts
      continue;
    } else if (part === '..') {
      // Go up one directory
      if (result.length > 0 && result[result.length - 1] !== '..') {
        result.pop();
      } else {
        result.push(part);
      }
    } else {
      result.push(part);
    }
  }
  
  return result.join('/') || '/';
}
