import { BaseShardedJsonManager } from './BaseShardedJsonManager';
import { Annotation } from '../../../shared';
import { fileProfileManager } from './FileProfileManager';


export class AnnotationManager extends BaseShardedJsonManager<Annotation> {
  constructor() {
    super('Annotation');
  }

  /**
   * 业务逻辑：获取注解（带默认值）
   */
 public async getAnnotation(filePath: string): Promise<Annotation | null> {
    const profile = await fileProfileManager.getProfile(filePath);
    if (!profile) return null;
    
    return this.getItem(profile.hash);
  }
  
  /**
   * 业务逻辑：更新注解
   */
  public async updateAnnotation(filePath: string, updates: Partial<Annotation>): Promise<void> {
    const profile = await fileProfileManager.getProfile(filePath);
    if (!profile) throw new Error(`File profile not found: ${filePath}`);

    const existing = this.getItem(profile.hash) ||  {
      like_count: 0,
      is_favorite: false,
      rotation: 0,
      screenshot_rotation: null,
      tags: []
    };
    const updated = { ...existing, ...updates };
    
    await this.setItem(profile.hash, updated as Annotation);
  }
}

export const annotationManager = new AnnotationManager();