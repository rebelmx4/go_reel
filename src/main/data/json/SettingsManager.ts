import { BaseJsonManager } from './BaseJsonManager';
import path from 'path';

/**
 * Application settings according to documentation
 */
export interface AppSettings {
  paths: {
    video_source: string; // Video source root directory
    staged_path: string; // Soft delete directory
    screenshot_export_path: string; // Screenshot export directory
  };
  playback: {
    global_volume: number; // 0-100
    like_decay_rate: number; // Like score decay coefficient
  };
  skip_frame: {
    skip_duration: number; // Seconds to pause on each frame
    rules: {
      [key: string]: number; // Duration threshold -> segment count
    };
  };
  key_bindings: {
    global: {
      view_nav: Record<string, string>;
      play_control: Record<string, string>;
      capture: Record<string, string>;
      interact: Record<string, string>;
      edit_tag: Record<string, string>;
      system: Record<string, string>;
    };
    dialog_assign_tag: {
      quick_assign_tags: Record<string, string>;
      system: Record<string, string>;
    };
  };
}

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

export class SettingsManager extends BaseJsonManager<AppSettings> {
  constructor() {
    super('settings.json', DEFAULT_SETTINGS);
  }

  // Path getters/setters
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
    return path.join(this.data.paths.staged_path, '待删除');
  }

  public getEditedPath(): string {
    return path.join(this.data.paths.staged_path, '已编辑');
  }

  public getScreenshotExportPath(): string {
    return this.data.paths.screenshot_export_path;
  }

  public setScreenshotExportPath(path: string): void {
    this.set({ paths: { ...this.data.paths, screenshot_export_path: path } });
  }

  // Playback getters/setters
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

  // Skip frame getters/setters
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

  // Key bindings getters
  public getKeyBindings(): AppSettings['key_bindings'] {
    return this.data.key_bindings;
  }

  public getGlobalKeyBindings(): AppSettings['key_bindings']['global'] {
    return this.data.key_bindings.global;
  }

  public getDialogKeyBindings(): AppSettings['key_bindings']['dialog_assign_tag'] {
    return this.data.key_bindings.dialog_assign_tag;
  }
}
