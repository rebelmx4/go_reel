import { BaseAssetManager } from './BaseAssetManager';

export class CoverManager extends BaseAssetManager {
  constructor() {
    super('covers');
  }

  /**
   * Get filename for default cover
   * @param hash - Video hash
   * @returns Filename like: [hash]_d.webp
   */
  private getDefaultCoverFilename(hash: string): string {
    return `${hash}_d.webp`;
  }

  /**
   * Get filename for manual cover
   * @param hash - Video hash
   * @returns Filename like: [hash].webp
   */
  private getManualCoverFilename(hash: string): string {
    return `${hash}.webp`;
  }

  /**
   * Save a default cover (auto-generated at 20% of video)
   * @param hash - Video hash
   * @param data - Image data buffer
   * @returns Path to saved file
   */
  public async saveDefaultCover(hash: string, data: Buffer): Promise<string> {
    return this.saveAsset(this.getDefaultCoverFilename(hash), data);
  }

  /**
   * Save a manual cover (user-selected from screenshot track)
   * @param hash - Video hash
   * @param data - Image data buffer
   * @returns Path to saved file
   */
  public async saveManualCover(hash: string, data: Buffer): Promise<string> {
    return this.saveAsset(this.getManualCoverFilename(hash), data);
  }

  /**
   * Get cover path with priority: manual > default > null
   * @param hash - Video hash
   * @returns Path to cover file, or null if none exists
   */
  public async getCoverPath(hash: string): Promise<string | null> {
    // Priority 1: Check for manual cover
    const manualPath = await this.getAssetPath(this.getManualCoverFilename(hash));
    if (manualPath) {
      return manualPath;
    }

    // Priority 2: Check for default cover
    const defaultPath = await this.getAssetPath(this.getDefaultCoverFilename(hash));
    if (defaultPath) {
      return defaultPath;
    }

    // Priority 3: No cover exists
    return null;
  }

  /**
   * Check if manual cover exists
   * @param hash - Video hash
   * @returns True if manual cover exists
   */
  public async hasManualCover(hash: string): Promise<boolean> {
    const path = await this.getAssetPath(this.getManualCoverFilename(hash));
    return path !== null;
  }

  /**
   * Check if default cover exists
   * @param hash - Video hash
   * @returns True if default cover exists
   */
  public async hasDefaultCover(hash: string): Promise<boolean> {
    const path = await this.getAssetPath(this.getDefaultCoverFilename(hash));
    return path !== null;
  }

  /**
   * Delete manual cover (keeps default cover)
   * @param hash - Video hash
   */
  public async deleteManualCover(hash: string): Promise<void> {
    return this.deleteAsset(this.getManualCoverFilename(hash));
  }

  /**
   * Delete default cover
   * @param hash - Video hash
   */
  public async deleteDefaultCover(hash: string): Promise<void> {
    return this.deleteAsset(this.getDefaultCoverFilename(hash));
  }

  /**
   * Delete all covers for a video
   * @param hash - Video hash
   */
  public async deleteAllCovers(hash: string): Promise<void> {
    await this.deleteManualCover(hash);
    await this.deleteDefaultCover(hash);
  }
}
