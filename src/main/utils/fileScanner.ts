import * as fs from 'fs/promises';
import path from 'path';
import { isVideoFile } from './videoUtils';
import log from 'electron-log';

/**
 * Scan result containing file path and creation time
 */
export interface ScanResult {
  path: string; // Absolute path to video file
  createdAt: number; // Creation timestamp in milliseconds
}

/**
 * Configuration for file scanner
 */
const MAX_CONCURRENCY = 200; // Maximum concurrent operations

/**
 * Scan directory for video files with concurrency control
 * @param rootDir Root directory to scan
 * @param blacklist Array of absolute paths to skip
 * @returns Array of scan results
 */
export async function scanVideoFiles(
  rootDir: string,
  blacklist: string[] = []
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  const queue: (() => Promise<void>)[] = [];
  let activePromises = 0;

  // Normalize blacklist paths for comparison
  const normalizedBlacklist = blacklist.map((p) => path.normalize(p).toLowerCase());

  let resolveFinish: () => void;
  let rejectFinish: (error: Error) => void;
  const finishPromise = new Promise<void>((res, rej) => {
    resolveFinish = res;
    rejectFinish = rej;
  });

  /**
   * Process queue - consumer function
   * Dispatches tasks while respecting concurrency limit
   */
  const processQueue = async (): Promise<void> => {
    while (queue.length > 0 && activePromises < MAX_CONCURRENCY) {
      activePromises++;

      const task = queue.shift();
      if (task) {
        task()
          .finally(() => {
            activePromises--;
            processQueue(); // Recursively process next task

            // Check if all tasks are complete
            if (activePromises === 0 && queue.length === 0) {
              resolveFinish();
            }
          })
          .catch((error) => {
            log.error('Error in scan task:', error);
            rejectFinish(error);
          });
      }
    }
  };

  /**
   * Check if a path is in the blacklist
   * @param dirPath Path to check
   * @returns True if path should be skipped
   */
  const isBlacklisted = (dirPath: string): boolean => {
    const normalizedPath = path.normalize(dirPath).toLowerCase();
    return normalizedBlacklist.some((blacklistedPath) =>
      normalizedPath.startsWith(blacklistedPath)
    );
  };

  /**
   * Process a directory - producer function
   * Reads directory and adds tasks to queue
   * @param currentPath Current directory path
   */
  const processDirectory = async (currentPath: string): Promise<void> => {
    try {
      // Check if this directory is blacklisted
      if (isBlacklisted(currentPath)) {
        log.info(`Skipping blacklisted directory: ${currentPath}`);
        return;
      }

      // Read directory contents
      const items = await fs.readdir(currentPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);

        if (item.isDirectory()) {
          // Add subdirectory to queue
          queue.push(() => processDirectory(fullPath));
        } else if (item.isFile() && isVideoFile(item.name)) {
          // Process video file
          try {
            const stats = await fs.stat(fullPath);
            results.push({
              path: fullPath,
              createdAt: stats.birthtimeMs, // Creation time in milliseconds
            });
          } catch (error) {
            log.warn(`Failed to get stats for file: ${fullPath}`, error);
          }
        }
      }
    } catch (error) {
      log.warn(`Failed to read directory: ${currentPath}`, error);
    }
  };

  // Initialize with root directory
  queue.push(() => processDirectory(rootDir));

  // Start processing
  processQueue();

  // Wait for all tasks to complete
  await finishPromise;

  log.info(`Scan complete. Found ${results.length} video files.`);
  return results;
}

/**
 * Get newest videos from scan results
 * @param scanResults Scan results
 * @param limit Maximum number of results (default: 100)
 * @returns Array of newest videos
 */
export function getNewestVideos(scanResults: ScanResult[], limit: number = 100): ScanResult[] {
  return [...scanResults]
    .sort((a, b) => b.createdAt - a.createdAt) // Sort by creation time descending
    .slice(0, limit);
}
