import { storageManager } from '../data/json'
import { AnnotationManager } from '../data/json/AnnotationManager'
import { scanVideoFiles, ScanResult } from '../utils/fileScanner'
import { calculateFastHash } from '../utils/hash'
import log from 'electron-log'
import { BrowserWindow } from 'electron'

/**
 * Refresh progress data
 */
export interface RefreshProgress {
  phase: 'scanning' | 'hashing' | 'syncing' | 'complete'
  current: number
  total: number
  currentFile?: string
}

/**
 * Refresh result
 */
export interface RefreshResult {
  success: boolean
  totalFiles: number
  newFiles: number
  movedFiles: number
  deletedFiles: number
  duplicateFiles: number
  error?: string
}

/**
 * File with hash
 */
interface FileWithHash extends ScanResult {
  hash: string
}

/**
 * Refresh service for syncing file system with metadata
 */
export class RefreshService {
  private mainWindow: BrowserWindow | null = null

  constructor(
    private settingsManager: SettingsManager,
    private metadataManager: AnnotationManager
  ) {}

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * Execute full refresh
   */
  async refresh(): Promise<RefreshResult> {
    log.info('=== Starting file refresh ===')

    try {
      // Phase 1: Scan files
      this.sendProgress({ phase: 'scanning', current: 0, total: 0 })
      const scannedFiles = await this.scanFiles()

      if (scannedFiles.length === 0) {
        log.warn('No files found during refresh')
        return {
          success: true,
          totalFiles: 0,
          newFiles: 0,
          movedFiles: 0,
          deletedFiles: 0,
          duplicateFiles: 0
        }
      }

      // Phase 2: Calculate hashes
      this.sendProgress({ phase: 'hashing', current: 0, total: scannedFiles.length })
      const filesWithHash = await this.calculateHashes(scannedFiles)

      // Phase 3: Sync metadata
      this.sendProgress({ phase: 'syncing', current: 0, total: filesWithHash.length })
      const result = await this.syncMetadata(filesWithHash)

      // Phase 4: Complete
      this.sendProgress({ phase: 'complete', current: 100, total: 100 })

      log.info('=== Refresh complete ===')
      log.info(
        `Total: ${result.totalFiles}, New: ${result.newFiles}, Moved: ${result.movedFiles}, Deleted: ${result.deletedFiles}, Duplicate: ${result.duplicateFiles}`
      )

      return result
    } catch (error) {
      log.error('Refresh failed:', error)
      return {
        success: false,
        totalFiles: 0,
        newFiles: 0,
        movedFiles: 0,
        deletedFiles: 0,
        duplicateFiles: 0,
        error: String(error)
      }
    }
  }

  /**
   * Phase 1: Scan files with blacklist filtering
   */
  private async scanFiles(): Promise<ScanResult[]> {
    const videoSource = this.settingsManager.getVideoSourcePath()
    const pendingDeletePath = this.settingsManager.getPendingDeletePath()
    const processedPath = this.settingsManager.getProcessedPath()

    const blacklist = [pendingDeletePath, processedPath].filter(Boolean)

    log.info(`Scanning: ${videoSource}`)
    log.info(`Blacklist: ${blacklist.join(', ')}`)

    return await scanVideoFiles(videoSource, blacklist)
  }

  /**
   * Phase 2: Calculate hashes for all files
   */
  private async calculateHashes(files: ScanResult[]): Promise<FileWithHash[]> {
    const filesWithHash: FileWithHash[] = []
    let processed = 0

    for (const file of files) {
      try {
        const hash = await calculateFastHash(file.path)
        filesWithHash.push({ ...file, hash })

        processed++

        // Update progress every 10 files to avoid UI flooding
        if (processed % 10 === 0 || processed === files.length) {
          this.sendProgress({
            phase: 'hashing',
            current: processed,
            total: files.length,
            currentFile: file.path
          })
        }
      } catch (error) {
        log.error(`Failed to hash file ${file.path}:`, error)
      }
    }

    return filesWithHash
  }

  /**
   * Phase 3: Sync metadata (handle 4 cases)
   */
  private async syncMetadata(filesWithHash: FileWithHash[]): Promise<RefreshResult> {
    const allMetadata = this.metadataManager.getAllFiles()
    const existingHashes = new Map(allMetadata)
    const scannedHashes = new Map<string, FileWithHash>()

    let newFiles = 0
    let movedFiles = 0
    let duplicateFiles = 0

    // Build scanned hash map
    for (const file of filesWithHash) {
      if (scannedHashes.has(file.hash)) {
        duplicateFiles++
      }
      scannedHashes.set(file.hash, file)
    }

    // Case 1 & 2 & 4: Process scanned files
    for (const file of filesWithHash) {
      const existing = existingHashes.get(file.hash)

      if (!existing) {
        // Case 1: New file - only add to memory, don't write to files.json
        newFiles++
        log.debug(`New file: ${file.path}`)
      } else {
        // Check if path changed
        const pathsArray = Array.isArray(existing.paths) ? existing.paths : [existing.paths]

        if (!pathsArray.includes(file.path)) {
          // Case 2: Moved/Renamed - update paths
          movedFiles++
          const updatedPaths = [...pathsArray, file.path]
          this.metadataManager.updateFile(file.hash, { paths: updatedPaths })
          log.debug(`Moved file: ${file.path}`)
        }
        // Case 4: Duplicate - already counted above
      }
    }

    // Case 3: Deleted files - remove from metadata
    let deletedFiles = 0
    for (const [hash, metadata] of existingHashes) {
      if (!scannedHashes.has(hash)) {
        // File not found in scan - check if it has valuable data
        const hasValue = this.hasValuableData(metadata)

        if (hasValue) {
          // Keep in metadata but mark as missing
          log.debug(`File missing but has valuable data: ${hash}`)
        } else {
          // Remove from metadata
          this.metadataManager.removeAnnotation(hash)
          deletedFiles++
          log.debug(`Deleted file: ${hash}`)
        }
      }
    }

    // Save metadata
    await this.metadataManager.save()

    return {
      success: true,
      totalFiles: filesWithHash.length,
      newFiles,
      movedFiles,
      deletedFiles,
      duplicateFiles
    }
  }

  /**
   * Check if file has valuable data
   */
  private hasValuableData(metadata: any): boolean {
    return (
      (metadata.like_count && metadata.like_count > 0) ||
      metadata.is_favorite === true ||
      (metadata.tags && metadata.tags.length > 0) ||
      (metadata.rotation && metadata.rotation !== 0) ||
      (metadata.screenshot_rotation && metadata.screenshot_rotation !== 0)
    )
  }

  /**
   * Send progress to renderer
   */
  private sendProgress(progress: RefreshProgress) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('refresh-progress', progress)
    }
  }
}

// ipcMain.handle('refresh-files', async () => {
//     try {
//       if (!refreshService) {
//         throw new Error('Refresh service not initialized');
//       }

//       const mainWindow = BrowserWindow.getAllWindows()[0];
//       if (mainWindow) {
//         refreshService.setMainWindow(mainWindow);
//       }
//       const result = await refreshService.refresh();
//       return result;
//     } catch (error) {
//       console.error('Failed to refresh files:', error);
//       return { success: false, totalFiles: 0, newFiles: 0, movedFiles: 0, deletedFiles: 0, duplicateFiles: 0, error: String(error) };
//     }
//   });
