import { BaseJsonManager } from './BaseJsonManager';
import path from 'path';
import { AppSettings } from '../../../shared/settings.schema'; 
import { DEFAULT_SETTINGS } from '../../../shared';

const SUB_DIRS = {
  TRASH: '待删除',
  EDITED: '已编辑',
  TRANSCODED: '已转码'
} as const;

/**
 * 设置管理器类
 * 继承自 BaseJsonManager，逻辑保持不变
 */
export class SettingsManager extends BaseJsonManager<AppSettings> {
  constructor() {
    super('settings.json', DEFAULT_SETTINGS);
  }

  /**
   * 返回当前所有设置的数据副本
   */
  public getData(): AppSettings {
    return this.data;
  }

  // --- 路径相关 Getters/Setters (逻辑未变) ---

  public getVideoSourcePath(): string {
    return this.data.paths.video_source;
  }

  public setVideoSourcePath(path: string): void {
    this.set({ paths: { ...this.data.paths, video_source: path } });
  }

  public getStagedPath(): string {
    return this.data.paths.staged_path;
  }
  
  public setStagedPath(path: string): void {
    this.set({ paths: { ...this.data.paths, staged_path: path } });
  }


  public getTrashPath(): string {
    return path.join(this.getStagedPath(), SUB_DIRS.TRASH);
  }

  public getEditedPath(): string {
    return path.join(this.getStagedPath(), SUB_DIRS.EDITED);
  }

  public getTranscodedPath(): string {
    return path.join(this.getStagedPath(), SUB_DIRS.TRANSCODED);
  }

  public getScreenshotExportPath(): string {
    return this.data.paths.screenshot_export_path;
  }

  public setScreenshotExportPath(path: string): void {
    this.set({ paths: { ...this.data.paths, screenshot_export_path: path } });
  }

  // --- 播放相关 Getters/Setters (逻辑未变) ---

  public getGlobalVolume(): number {
    return this.data.playback.global_volume;
  }

  public setGlobalVolume(volume: number): void {
    this.set({ playback: { ...this.data.playback, global_volume: volume } });
  }

  public getLikeDecayRate(): number {
    return this.data.playback.like_decay_rate;
  }

  public setLikeDecayRate(rate: number): void {
    this.set({ playback: { ...this.data.playback, like_decay_rate: rate } });
  }

  // --- 跳帧预览 Getters/Setters (逻辑未变) ---

  public getSkipFrameDuration(): number {
    return this.data.skip_frame.skip_duration;
  }

  public setSkipFrameDuration(duration: number): void {
    this.set({ skip_frame: { ...this.data.skip_frame, skip_duration: duration } });
  }

  public getSkipFrameRules(): Record<string, number> {
    return this.data.skip_frame.rules;
  }

  public setSkipFrameRules(rules: Record<string, number>): void {
    this.set({ skip_frame: { ...this.data.skip_frame, rules } });
  }

  // --- 快捷键 Getters (逻辑未变) ---

  public getKeyBindings(): AppSettings['key_bindings'] {
    return this.data.key_bindings;
  }

  public getGlobalKeyBindings(): AppSettings['key_bindings']['global'] {
    return this.data.key_bindings.global;
  }

  public getDialogKeyBindings(): AppSettings['key_bindings']['dialog_assign_tag'] {
    return this.data.key_bindings.dialog_assign_tag;
  }

  public setKeyBindings(bindings: AppSettings['key_bindings']): void {
    this.set({ key_bindings: bindings });
  }
}

export const settingsManager = new SettingsManager();