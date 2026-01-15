import { BaseJsonManager } from './BaseJsonManager';
import path from 'path';
// 导入新的类型定义 (注意：根据你截图中的文件名是 'ettings.schema.ts'，这里先按这个写)
import { AppSettings } from '../../../shared/settings.schema'; 

/**
 * 默认设置
 * 根据新的 AppSettings 结构进行了调整
 */
const DEFAULT_SETTINGS: AppSettings = {
  paths: {
    video_source: '',
    staged_path: '',
    screenshot_export_path: '',
  },
  playback: {
    global_volume: 80,
    like_decay_rate: 0.2,
    default_rate: 1.0, // 新增
  },
  skip_frame: {
    skip_duration: 2,
    rules: {
      '60s': 0,
      '30m': 10,
      '120m': 30,
      '10000m': 60,
    },
  },
  key_bindings: {
    global: {
      view_nav: {
        list_history: '1',
        list_newest: '2',
        list_search: '3',
        list_liked: '5',
        list_elite: '6',
        back_to_player: 'Esc', // 从 system 移动到了这里
      },
      play_control: {
        toggle_play: 'Space',
        step_backward: 'A',
        step_forward: 'D',
        volume_up: 'W',
        volume_down: 'S',
        rotate_video: 'R',
        play_next: "PageDown"
      },
      capture: {
        screenshot: 'E',
        export_screenshot: 'Ctrl+E',
        export_screenshot_with_dialog: 'Alt+E',
        record_clip: 'K',
        cancel_record: 'Shift+K',
      },
      interact: {
        like: 'F',
        favorite: 'Shift+F',
      },
      edit_tag: {
        toggle_track: 'Tab',
        cut_segment: 'Q',
        merge_segments: 'Shift+Q',
        create_tag_from_selection: 'T',
        open_assign_tag_dialog: 'Shift+G',
        quick_tag_1: 'Alt+1',
        quick_tag_2: 'Alt+2',
      },
      system: {
        refresh: 'F5',
        soft_delete: 'Ctrl+Delete',
        open_settings: 'Ctrl+,', // 新增字段
        open_video_dir: 'Ctrl+Shift+O', 
      },
    },
    dialog_assign_tag: {
      quick_assign_tags: {
        slot_1: '1',
        slot_2: '2',
        slot_3: '3',
        slot_4: '4',
        slot_5: '5',
        slot_6: 'Q',
        slot_7: 'W',
        slot_8: 'E',
        slot_9: 'R',
        slot_10: '~',
      },
      system: {
        confirm: 'Enter',
        cancel: 'Esc',
      },
    },
  },
};

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