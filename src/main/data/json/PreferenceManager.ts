import { BaseJsonManager } from './BaseJsonManager'
import { PreferenceSettings, KeyBindingsConfig } from '../../../shared/settings.schema'
import { DEFAULT_SETTINGS } from '../../../shared/constants'

/**
 * 偏好设置管理器
 * 负责管理 preferences.json，包含播放参数、跳帧规则和快捷键配置
 */
export class PreferenceManager extends BaseJsonManager<PreferenceSettings> {
  constructor() {
    // 存储文件名为 preferences.json，使用常量中的默认值
    super('preferences.json', DEFAULT_SETTINGS)
  }

  /**
   * 获取完整的偏好设置数据
   */
  public getAllData(): PreferenceSettings {
    return this.data
  }

  // --- 播放相关 (Playback) ---

  public getGlobalVolume(): number {
    return this.data.playback.global_volume
  }

  public setGlobalVolume(volume: number): void {
    this.set({
      playback: { ...this.data.playback, global_volume: volume }
    })
  }

  public getPlaybackSettings(): PreferenceSettings['playback'] {
    return this.data.playback
  }

  public updatePlaybackSettings(updates: Partial<PreferenceSettings['playback']>): void {
    this.set({
      playback: { ...this.data.playback, ...updates }
    })
  }

  // --- 跳帧预览相关 (Skip Frame) ---

  public getSkipFrameDuration(): number {
    return this.data.skip_frame.skip_duration
  }

  public setSkipFrameDuration(duration: number): void {
    this.set({
      skip_frame: { ...this.data.skip_frame, skip_duration: duration }
    })
  }

  public getSkipFrameRules(): Record<string, number> {
    return this.data.skip_frame.rules
  }

  public setSkipFrameRules(rules: Record<string, number>): void {
    this.set({
      skip_frame: { ...this.data.skip_frame, rules }
    })
  }

  // --- 快捷键相关 (Key Bindings) ---

  public getKeyBindings(): KeyBindingsConfig {
    return this.data.key_bindings
  }

  /**
   * 更新全局快捷键配置
   */
  public setKeyBindings(bindings: KeyBindingsConfig): void {
    this.set({ key_bindings: bindings })
  }

  /**
   * 获取特定分类的快捷键 (例如：play_control)
   */
  public getGlobalActions<K extends keyof KeyBindingsConfig['global']>(
    category: K
  ): KeyBindingsConfig['global'][K] {
    return this.data.key_bindings.global[category]
  }

  /**
   * 重置为默认快捷键
   */
  public resetKeyBindings(): void {
    this.set({ key_bindings: DEFAULT_SETTINGS.key_bindings })
  }
}

// 导出单例
export const preferenceManager = new PreferenceManager()
