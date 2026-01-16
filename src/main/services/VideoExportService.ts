import { SettingsManager } from '../data/json/SettingsManager';
import { AnnotationManager } from '../data/json/AnnotationManager';
import { calculateFastHash } from '../utils/hash';
import * as fs from 'fs-extra';
import * as path from 'path';
import { app, BrowserWindow } from 'electron';
import log from 'electron-log';
import ffmpeg from 'fluent-ffmpeg';


export interface VideoClip {
  startTime: number;
  endTime: number;
  state: 'keep' | 'remove';
}

export interface ExportResult {
  success: boolean;
  newHash?: string;
  error?: string;
}

export class VideoExportService {
  private mainWindow: BrowserWindow | null = null;

  constructor(
    private settingsManager: SettingsManager,
    private metadataManager: AnnotationManager
  ) {}

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  /**
   * Export video with clips
   */
  async exportVideo(videoPath: string, clips: VideoClip[]): Promise<ExportResult> {
    log.info('=== Starting video export ===');
    log.info(`Video: ${videoPath}`);
    log.info(`Clips: ${clips.length}`);

    try {
      // Filter keep clips
      const keepClips = clips.filter(c => c.state === 'keep').sort((a, b) => a.startTime - b.startTime);
      
      if (keepClips.length === 0) {
        throw new Error('No clips to keep');
      }

      // Calculate old hash
      const oldHash = await calculateFastHash(videoPath);
      log.info(`Old hash: ${oldHash}`);

      // Create temp directory
      const tempDir = path.join(app.getPath('temp'), `video_export_${Date.now()}`);
      await fs.ensureDir(tempDir);

      // Step 1: Extract clip segments
      const segmentPaths: string[] = [];
      for (let i = 0; i < keepClips.length; i++) {
        const clip = keepClips[i];
        const segmentPath = path.join(tempDir, `segment_${i}.mp4`);
        
        await this.extractSegment(videoPath, clip.startTime, clip.endTime, segmentPath);
        segmentPaths.push(segmentPath);
        
        this.sendProgress({
          phase: 'extracting',
          current: i + 1,
          total: keepClips.length
        });
      }

      // Step 2: Concatenate segments
      const outputPath = path.join(tempDir, 'output.mp4');
      await this.concatenateSegments(segmentPaths, outputPath);

      // Step 3: Archive old file
      const editedPath = this.settingsManager.getProcessedPath();
      const videoDir = path.dirname(videoPath);
      const videoName = path.basename(videoPath);
      const archivePath = path.join(editedPath, videoName);
      
      await fs.ensureDir(editedPath);
      await fs.move(videoPath, archivePath, { overwrite: true });
      log.info(`Archived old file to: ${archivePath}`);

      // Step 4: Move new file to original location
      await fs.move(outputPath, videoPath, { overwrite: true });
      log.info(`Saved new file to: ${videoPath}`);

      // Step 5: Calculate new hash
      const newHash = await calculateFastHash(videoPath);
      log.info(`New hash: ${newHash}`);

      // Step 6: Migrate metadata
      await this.migrateMetadata(oldHash, newHash, keepClips);

      // Cleanup temp directory
      await fs.remove(tempDir);

      log.info('=== Export complete ===');
      return { success: true, newHash };
    } catch (error) {
      log.error('Export failed:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Extract a segment from video
   */
  private extractSegment(inputPath: string, startTime: number, endTime: number, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const duration = endTime - startTime;
      
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputPath)
        .videoCodec('copy')
        .audioCodec('copy')
        .on('end', () => {
          log.info(`Extracted segment: ${startTime}s - ${endTime}s`);
          resolve();
        })
        .on('error', (err) => {
          log.error(`Failed to extract segment:`, err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Concatenate multiple video segments
   */
  private concatenateSegments(segmentPaths: string[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create concat file
      const concatFilePath = path.join(path.dirname(outputPath), 'concat.txt');
      const concatContent = segmentPaths.map(p => `file '${p}'`).join('\n');
      fs.writeFileSync(concatFilePath, concatContent);

      ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions('-c copy')
        .output(outputPath)
        .on('end', () => {
          log.info('Concatenation complete');
          fs.unlinkSync(concatFilePath);
          resolve();
        })
        .on('error', (err) => {
          log.error('Concatenation failed:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Migrate metadata from old hash to new hash
   */
  private async migrateMetadata(oldHash: string, newHash: string, keepClips: VideoClip[]): Promise<void> {
    log.info('Migrating metadata...');

    const userDataPath = app.getPath('userData');

    // 2. Migrate covers
    const coversDir = path.join(userDataPath, 'data', 'covers');
    const oldCover = path.join(coversDir, `${oldHash}.webp`);
    const newCover = path.join(coversDir, `${newHash}.webp`);
    const oldCoverD = path.join(coversDir, `${oldHash}_d.webp`);
    const newCoverD = path.join(coversDir, `${newHash}_d.webp`);

    if (await fs.pathExists(oldCover)) {
      await fs.move(oldCover, newCover, { overwrite: true });
      log.info('Cover migrated');
    }
    if (await fs.pathExists(oldCoverD)) {
      await fs.move(oldCoverD, newCoverD, { overwrite: true });
      log.info('Cover (dark) migrated');
    }

    // 3. Migrate screenshots
    const screenshotsDir = path.join(userDataPath, 'data', 'screenshots');
    const oldScreenshotDir = path.join(screenshotsDir, oldHash);
    const newScreenshotDir = path.join(screenshotsDir, newHash);

    if (await fs.pathExists(oldScreenshotDir)) {
      // Calculate time offset for each clip
      const screenshots = await fs.readdir(oldScreenshotDir);
      await fs.ensureDir(newScreenshotDir);

      for (const screenshot of screenshots) {
        // Parse timestamp from filename (e.g., i_120000.webp -> 120000ms)
        const match = screenshot.match(/i_(\d+)\.webp/);
        if (match) {
          const oldTimestamp = parseInt(match[1]);
          const newTimestamp = this.calculateNewTimestamp(oldTimestamp, keepClips);

          const oldPath = path.join(oldScreenshotDir, screenshot);
          const newPath = path.join(newScreenshotDir, `i_${newTimestamp}.webp`);
          
          await fs.move(oldPath, newPath);
        }
      }

      // Remove old directory
      await fs.remove(oldScreenshotDir);
      log.info('Screenshots migrated and timestamps adjusted');
    }
  }

  /**
   * Calculate new timestamp after removing clips
   */
  private calculateNewTimestamp(oldTimestamp: number, keepClips: VideoClip[]): number {
    let cumulativeOffset = 0;
    let newTimestamp = oldTimestamp;

    for (const clip of keepClips) {
      const clipStartMs = clip.startTime * 1000;
      const clipEndMs = clip.endTime * 1000;

      if (oldTimestamp >= clipStartMs && oldTimestamp <= clipEndMs) {
        // Screenshot is in this keep clip
        newTimestamp = oldTimestamp - cumulativeOffset;
        break;
      } else if (oldTimestamp > clipEndMs) {
        // Screenshot is after this clip, continue accumulating
        continue;
      }
    }

    return newTimestamp;
  }

  /**
   * Send progress to renderer
   */
  private sendProgress(progress: any) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('export-progress', progress);
    }
  }
}
