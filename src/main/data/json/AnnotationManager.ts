import { BaseShardedJsonManager } from './BaseShardedJsonManager';
import { Annotation, DEFAULT_ANNOTATION } from '../../../shared';

export class AnnotationManager extends BaseShardedJsonManager<Annotation> {
  constructor() {
    // 只需要告诉父类存储在 'Annotation' 文件夹
    super('Annotation');
  }

  /**
   * 业务逻辑：获取注解（带默认值）
   */
  public getAnnotation(hash: string): Annotation {
    return this.getItem(hash) || { ...DEFAULT_ANNOTATION };
  }

  /**
   * 业务逻辑：更新注解
   */
  public async updateAnnotation(hash: string, updates: Partial<Annotation>): Promise<void> {
    // 调用基类的通用更新方法
    await this.updateItem(hash, updates, { ...DEFAULT_ANNOTATION });
  }
}

export const annotationManager = new AnnotationManager();