import * as fs from 'fs/promises';
import { constants } from 'fs';

// Configuration constants
const CONFIG = {
  THRESHOLD: 10 * 1024, // 10KB
  BLOCK_SIZE: 2 * 1024, // 2KB
};

// --- Caching Layer ---
interface CacheEntry {
  hash: string;
  size: number; // Store file size
  mtime: number; // Store modification time
}

const fileHashCache = new Map<string, CacheEntry>();

/**
 * FNV-1a 64-bit hash algorithm
 */
function fnv1a64(buffer: Buffer, seed: bigint = 0xcbf29ce484222325n): bigint {
  const FNV_PRIME = 0x100000001b3n;
  let hash = seed;

  for (let i = 0; i < buffer.length; i++) {
    hash ^= BigInt(buffer[i]);
    hash = BigInt.asUintN(64, hash * FNV_PRIME);
  }
  return hash;
}

/**
 * Calculate fast hash for video files
 * Algorithm: Head (2KB) + Mid (2KB) + Tail (2KB) + FileSize -> FNV-1a_64 -> Hex String
 *
 * Now with a corrected and robust cache based on file path, size, and modification time.
 */
export async function calculateFastHash(filePath: string): Promise<string> {
  let fileHandle: fs.FileHandle | null = null;

  try {
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const mtime = stat.mtime.getTime();

    // --- Corrected Cache Check ---
    const cachedEntry = fileHashCache.get(filePath);
    if (cachedEntry && fileSize === cachedEntry.size && mtime === cachedEntry.mtime) {
      // File size and modification time match, it's safe to return the cached hash
      return cachedEntry.hash;
    }

    // --- Proceed with hashing if cache miss ---
    fileHandle = await fs.open(filePath, constants.O_RDONLY);

    let buffer: Buffer;

    if (fileSize < CONFIG.THRESHOLD) {
      // Small file: read entire content
      buffer = Buffer.alloc(fileSize);
      await fileHandle.read(buffer, 0, fileSize, 0);
    } else {
      // Large file: sample head + mid + tail
      buffer = Buffer.alloc(CONFIG.BLOCK_SIZE * 3);
      // Read head
      await fileHandle.read(buffer, 0, CONFIG.BLOCK_SIZE, 0);
      // Read mid
      const midOffset = Math.floor(fileSize / 2) - Math.floor(CONFIG.BLOCK_SIZE / 2);
      await fileHandle.read(buffer, CONFIG.BLOCK_SIZE, CONFIG.BLOCK_SIZE, midOffset);
      // Read tail
      const tailOffset = fileSize - CONFIG.BLOCK_SIZE;
      await fileHandle.read(buffer, CONFIG.BLOCK_SIZE * 2, CONFIG.BLOCK_SIZE, tailOffset);
    }

    // Calculate content hash
    let hashVal = fnv1a64(buffer);

    // Mix in file size to prevent collisions
    const sizeBuffer = Buffer.alloc(8);
    sizeBuffer.writeBigUInt64LE(BigInt(fileSize));
    hashVal = fnv1a64(sizeBuffer, hashVal);

    const hash = hashVal.toString(16).padStart(16, '0');

    // --- Store the new hash and correct metadata in the cache ---
    fileHashCache.set(filePath, { hash, size: fileSize, mtime });

    return hash;
  } catch (error) {
    console.error(`Hash calculation failed for: ${filePath}`, error);
    throw error;
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}

/**
 * Batch calculate hashes for multiple files
 */
export async function calculateHashBatch(
  filePaths: string[],
  onProgress?: (processed: number, total: number, currentFile: string) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    try {
      const hash = await calculateFastHash(filePath);
      results.set(filePath, hash);

      if (onProgress && (i % 100 === 0 || i === filePaths.length - 1)) {
        onProgress(i + 1, filePaths.length, filePath);
      }
    } catch (error) {
      console.error(`Failed to hash file: ${filePath}`, error);
      // Continue with other files
    }
  }

  return results;
}