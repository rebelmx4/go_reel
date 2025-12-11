import { BaseJsonManager } from './BaseJsonManager';

/**
 * Video metadata according to documentation
 */
export interface Annotation {
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
export interface AnnotaionList {
  [hash: string]: Annotation;
}

export class AnnotationManager extends BaseJsonManager<AnnotaionList> {
  constructor() {
    super('annotations.json', {});
  }

  /**
   * Get metadata for a video by hash
   * @param hash - Video hash
   * @returns Video metadata or undefined
   */
  public getAnnotation(hash: string): Annotation | undefined {
    return this.data[hash];
  }

  /**
   * Add or update a video's metadata
   * @param hash - Video hash
   * @param metadata - Video metadata
   */
  public addAnnotation(hash: string, metadata: Annotation): void {
    this.set({ [hash]: metadata });
  }

  /**
   * Update specific fields of a video's metadata
   * @param hash - Video hash
   * @param updates - Partial metadata to update
   */
  public updateAnnotation(hash: string, updates: Partial<Annotation>): void {
    const file = this.data[hash];
    if (file) {
      this.set({ [hash]: { ...file, ...updates } });
    }
  }

  /**
   * Remove a video's metadata
   * @param hash - Video hash
   */
  public removeAnnotation(hash: string): void {
    const newData = { ...this.data };
    delete newData[hash];
    this.data = newData;
    this.save();
  }

  /**
   * Get all video metadata
   * @returns Array of [hash, metadata] tuples
   */
  public getAllAnnotations(): Array<[string, Annotation]> {
    return Object.entries(this.data);
  }

  /**
   * Get all favorite videos
   * @returns Array of [hash, metadata] tuples for favorites
   */
  public getFavorites(): Array<[string, Annotation]> {
    return this.getAllAnnotations().filter(([_, metadata]) => metadata.is_favorite);
  }

  /**
   * Get videos with like_count above threshold
   * @param threshold - Minimum like count
   * @returns Array of [hash, metadata] tuples
   */
  public getByLikeCount(threshold: number): Array<[string, Annotation]> {
    return this.getAllAnnotations().filter(([_, metadata]) => metadata.like_count >= threshold);
  }

  /**
   * Get videos with specific tag
   * @param tagId - Tag ID to filter by
   * @returns Array of [hash, metadata] tuples
   */
  public getByTag(tagId: number): Array<[string, Annotation]> {
    return this.getAllAnnotations().filter(([_, metadata]) => metadata.tags.includes(tagId));
  }
}

export const annotationManager = new AnnotationManager();