import { BaseJsonManager } from './BaseJsonManager';
import path from 'path';

/**
 * 应用程序设置的完整类型定义
 * @interface AppSettings
 */
export interface AppSettings {
  // 路径相关设置
  paths: {
    video_source: string; // 视频源文件根目录
    staged_path: string; // "暂存区" 目录，用于存放待删除或已编辑的视频
    screenshot_export_path: string; // 截图导出目录
  };
  // 播放相关设置
  playback: {
    global_volume: number; // 全局音量 (0-100)
    like_decay_rate: number; // "喜欢" 分数的衰减系数
  };
  // 跳帧预览设置
  skip_frame: {
    skip_duration: number; // 每帧悬停的秒数
    rules: {
      [key: string]: number; // 视频时长阈值 -> 生成的预览分段数量
    };
  };
  // 快捷键绑定
  key_bindings: {
    // 全局快捷键
    global: {
      view_nav: Record<string, string>; // 视图导航
      play_control: Record<string, string>; // 播放控制
      capture: Record<string, string>; // 截图与录制
      interact: Record<string, string>; // 交互操作 (喜欢/收藏)
      edit_tag: Record<string, string>; // 标签编辑
      system: Record<string, string>; // 系统操作
    };
    // "分配标签" 对话框内的快捷键
    dialog_assign_tag: {
      quick_assign_tags: Record<string, string>; // 快速分配标签槽位
      system: Record<string, string>; // 对话框系统操作
    };
  };
}

/**
 * 默认设置
 * 当设置文件不存在或损坏时，将使用此对象
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
        list_recent: '1',
        list_newest: '2',
        list_search: '3',
        list_random: '4',
        list_liked: '5',
        list_elite: '6',
      },
      play_control: {
        toggle_play: 'Space',
        step_backward: 'A',
        step_forward: 'D',
        volume_up: 'W',
        volume_down: 'S',
        rotate_video: 'Alt+R',
      },
      capture: {
        screenshot: 'E',
        export_screenshot: 'Ctrl+E',
        export_screenshot_with_dialog: 'Alt+E',
        record_clip: 'R',
        cancel_record: 'Shift+R',
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
        back_to_player: 'Esc',
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

/**
 * 设置管理器类
 * 继承自 BaseJsonManager，用于管理 settings.json 文件
 */
export class SettingsManager extends BaseJsonManager<AppSettings> {
  constructor() {
    // 调用父类构造函数，指定文件名和默认设置
    super('settings.json', DEFAULT_SETTINGS);
  }

   /**
   * [新增] 返回当前所有设置的数据副本
   * @returns {AppSettings}
   */
  public getData(): AppSettings {
    return this.data;
  }

  // --- 路径相关 Getters/Setters ---

  public getVideoSourcePath(): string {
    return this.data.paths.video_source;
  }

  public setVideoSourcePath(path: string): void {
    // 使用 set 方法更新配置，这会触发写入文件
    this.set({ paths: { ...this.data.paths, video_source: path } });
  }

  public getStagedPath(): string {
    return this.data.paths.staged_path;
  }
  
  public setStagedPath(path: string): void {
    this.set({ paths: { ...this.data.paths, staged_path: path } });
  }

  /**
   * 获取 "待删除" 文件夹的完整路径 (软删除)
   * @returns {string} 派生出的路径
   */
  public getTrashPath(): string {
    return path.join(this.data.paths.staged_path, '待删除');
  }

  /**
   * 获取 "已编辑" 文件夹的完整路径
   * @returns {string} 派生出的路径
   */
  public getEditedPath(): string {
    return path.join(this.data.paths.staged_path, '已编辑');
  }

  public getScreenshotExportPath(): string {
    return this.data.paths.screenshot_export_path;
  }

  public setScreenshotExportPath(path: string): void {
    this.set({ paths: { ...this.data.paths, screenshot_export_path: path } });
  }

  // --- 播放相关 Getters/Setters ---

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

  // --- 跳帧预览 Getters/Setters ---

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

  // --- 快捷键 Getters ---

  /**
   * 获取所有快捷键绑定
   * @returns {AppSettings['key_bindings']}
   */
  public getKeyBindings(): AppSettings['key_bindings'] {
    return this.data.key_bindings;
  }

  public getGlobalKeyBindings(): AppSettings['key_bindings']['global'] {
    return this.data.key_bindings.global;
  }

  public getDialogKeyBindings(): AppSettings['key_bindings']['dialog_assign_tag'] {
    return this.data.key_bindings.dialog_assign_tag;
  }

  /**
   * [新增] 一次性更新整个快捷键设置对象
   * @param {AppSettings['key_bindings']} bindings - 新的快捷键配置对象
   */
  public setKeyBindings(bindings: AppSettings['key_bindings']): void {
    this.set({ key_bindings: bindings });
  }
}

/**
 * 创建并导出一个 settingsManager 单例
 * 在整个应用程序中共享此实例，以确保数据一致性
 */
export const settingsManager = new SettingsManager();