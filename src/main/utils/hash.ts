import * as fs from 'fs/promises'
import { constants } from 'fs'

// Configuration constants
const CONFIG = {
  THRESHOLD: 10 * 1024, // 10KB
  BLOCK_SIZE: 2 * 1024 // 2KB
}

/**
 * FNV-1a 64-bit hash algorithm
 */
function fnv1a64(buffer: Buffer, seed: bigint = 0xcbf29ce484222325n): bigint {
  const FNV_PRIME = 0x100000001b3n
  let hash = seed

  for (let i = 0; i < buffer.length; i++) {
    hash ^= BigInt(buffer[i])
    hash = BigInt.asUintN(64, hash * FNV_PRIME)
  }
  return hash
}

/**
 * Calculate fast hash for video files
 * Algorithm: Head (2KB) + Mid (2KB) + Tail (2KB) + FileSize -> FNV-1a_64 -> Hex String
 *
 * For files < 10KB: reads entire file
 * For files >= 10KB: samples 6KB (head + mid + tail)
 */
export async function calculateFastHash(filePath: string): Promise<string> {
  let fileHandle: fs.FileHandle | null = null

  try {
    fileHandle = await fs.open(filePath, constants.O_RDONLY)
    const stat = await fileHandle.stat()
    const fileSize = stat.size

    let buffer: Buffer

    if (fileSize < CONFIG.THRESHOLD) {
      // Small file: read entire content
      buffer = Buffer.alloc(fileSize)
      await fileHandle.read(buffer, 0, fileSize, 0)
    } else {
      // Large file: sample head + mid + tail
      buffer = Buffer.alloc(CONFIG.BLOCK_SIZE * 3)

      // Read head
      await fileHandle.read(buffer, 0, CONFIG.BLOCK_SIZE, 0)

      // Read mid
      const midOffset = Math.floor(fileSize / 2) - Math.floor(CONFIG.BLOCK_SIZE / 2)
      await fileHandle.read(buffer, CONFIG.BLOCK_SIZE, CONFIG.BLOCK_SIZE, midOffset)

      // Read tail
      const tailOffset = fileSize - CONFIG.BLOCK_SIZE
      await fileHandle.read(buffer, CONFIG.BLOCK_SIZE * 2, CONFIG.BLOCK_SIZE, tailOffset)
    }

    // Calculate content hash
    let hashVal = fnv1a64(buffer)

    // Mix in file size to prevent collisions
    const sizeBuffer = Buffer.alloc(8)
    sizeBuffer.writeBigUInt64LE(BigInt(fileSize))
    hashVal = fnv1a64(sizeBuffer, hashVal)

    // Output as 16-char hex string
    return hashVal.toString(16).padStart(16, '0')
  } catch (error) {
    console.error(`Hash calculation failed for: ${filePath}`, error)
    throw error
  } finally {
    if (fileHandle) {
      await fileHandle.close()
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
  const results = new Map<string, string>()

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i]

    try {
      const hash = await calculateFastHash(filePath)
      results.set(filePath, hash)

      // Update progress every 100 files to prevent UI flicker
      if (onProgress && (i % 100 === 0 || i === filePaths.length - 1)) {
        onProgress(i + 1, filePaths.length, filePath)
      }
    } catch (error) {
      console.error(`Failed to hash file: ${filePath}`, error)
      // Continue with other files
    }
  }

  return results
}
