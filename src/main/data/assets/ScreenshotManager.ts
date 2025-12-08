import { BaseAssetManager } from './BaseAssetManager';

export class ScreenshotManager extends BaseAssetManager {
  constructor() {
    super('screenshots');
  }

  /**
   * Save a manual screenshot
   * @param hash - Video hash
   * @param timestamp - Timestamp in milliseconds
   * @param data - Image data buffer
   * @returns Path to saved file
   */
  public async saveManualScreenshot(
    hash: string,
    timestamp: number,
    data: Buffer
  ): Promise<string> {
    const filename = `${timestamp}_m.webp`;
    return this.saveHashBasedFile(hash, filename, data);
  }

  /**
   * Save an auto-generated screenshot
   * @param hash - Video hash
   * @param timestamp - Timestamp in milliseconds
   * @param data - Image data buffer
   * @returns Path to saved file
   */
  public async saveAutoScreenshot(
    hash: string,
    timestamp: number,
    data: Buffer
  ): Promise<string> {
    const filename = `${timestamp}_a.webp`;
    return this.saveHashBasedFile(hash, filename, data);
  }

  /**
   * Save a recorded video clip
   * @param hash - Video hash
   * @param timestamp - Timestamp in milliseconds when recording started
   * @param data - Video data buffer
   * @returns Path to saved file
   */
  public async saveRecordedClip(
    hash: string,
    timestamp: number,
    data: Buffer
  ): Promise<string> {
    const filename = `v_${timestamp}.mp4`;
    return this.saveHashBasedFile(hash, filename, data);
  }

  /**
   * Get all screenshots and clips for a video
   * @param hash - Video hash
   * @returns Array of filenames
   */
  public async getScreenshotsForVideo(hash: string): Promise<string[]> {
    return this.listHashBasedFiles(hash);
  }

  /**
   * Delete a specific screenshot or clip
   * @param hash - Video hash
   * @param filename - Filename to delete
   */
  public async deleteScreenshot(hash: string, filename: string): Promise<void> {
    return this.deleteHashBasedFile(hash, filename);
  }

  /**
   * Check if a video has any screenshots
   * @param hash - Video hash
   * @returns True if video has screenshots
   */
  public async hasScreenshots(hash: string): Promise<boolean> {
    const files = await this.getScreenshotsForVideo(hash);
    return files.length > 0;
  }

  /**
   * Get the full path to a specific screenshot
   * @param hash - Video hash
   * @param filename - Filename
   * @returns Full path to the screenshot
   */
  public getScreenshotPath(hash: string, filename: string): string {
    return this.getHashBasedPath(hash, filename);
  }
}
