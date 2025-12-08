import { BaseJsonManager } from './BaseJsonManager';

/**
 * Video metadata according to documentation
 */
export interface VideoMetadata {
  paths: string[]; // Array of relative paths (relative to video_source)
  like_count: number; // Like/heat score
  is_favorite: boolean; // Whether in elite/favorite list
  rotation: 0 | 90 | 180 | 270; // Video playback rotation
  screenshot_rotation: 0 | 90 | 180 | 270 | null; // Screenshot export rotation (null = not set)
  tags: number[]; // Array of tag IDs (numbers)
}

/**
 * Metadata store - keyed by video hash
 */
export interface MetadataStore {
  [hash: string]: VideoMetadata;
}

export class MetadataManager extends BaseJsonManager<MetadataStore> {
  constructor() {
    super('files.json', {});
  }

  /**
   * Get metadata for a video by hash
   * @param hash - Video hash
   * @returns Video metadata or undefined
   */
  public getFile(hash: string): VideoMetadata | undefined {
    return this.data[hash];
  }

  /**
   * Add or update a video's metadata
   * @param hash - Video hash
   * @param metadata - Video metadata
   */
  public addFile(hash: string, metadata: VideoMetadata): void {
    this.set({ [hash]: metadata });
  }

  /**
   * Update specific fields of a video's metadata
   * @param hash - Video hash
   * @param updates - Partial metadata to update
   */
  public updateFile(hash: string, updates: Partial<VideoMetadata>): void {
    const file = this.data[hash];
    if (file) {
      this.set({ [hash]: { ...file, ...updates } });
    }
  }

  /**
   * Remove a video's metadata
   * @param hash - Video hash
   */
  public removeFile(hash: string): void {
    const newData = { ...this.data };
    delete newData[hash];
    this.data = newData;
    this.save();
  }

  /**
   * Get all video metadata
   * @returns Array of [hash, metadata] tuples
   */
  public getAllFiles(): Array<[string, VideoMetadata]> {
    return Object.entries(this.data);
  }

  /**
   * Get all favorite videos
   * @returns Array of [hash, metadata] tuples for favorites
   */
  public getFavorites(): Array<[string, VideoMetadata]> {
    return this.getAllFiles().filter(([_, metadata]) => metadata.is_favorite);
  }

  /**
   * Get videos with like_count above threshold
   * @param threshold - Minimum like count
   * @returns Array of [hash, metadata] tuples
   */
  public getByLikeCount(threshold: number): Array<[string, VideoMetadata]> {
    return this.getAllFiles().filter(([_, metadata]) => metadata.like_count >= threshold);
  }

  /**
   * Get videos with specific tag
   * @param tagId - Tag ID to filter by
   * @returns Array of [hash, metadata] tuples
   */
  public getByTag(tagId: number): Array<[string, VideoMetadata]> {
    return this.getAllFiles().filter(([_, metadata]) => metadata.tags.includes(tagId));
  }
}
