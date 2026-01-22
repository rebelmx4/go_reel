/**
 * 1. 存储路径相关设置 (存储在 storage_paths.json)
 */
export interface StorageSettings {
  video_source: string;
  staged_path: string;
  screenshot_export_path: string;
}


/**
 * 1. 定义具体的动作分类接口
 * 这里的属性名（Key）就是你在代码中直接使用的“变量名”/“动作名”
 */

export interface ViewNavActions {
  player_page: string;   
  history_page: string;
  newest_page: string;
  search_page: string;
  tag_search_page: string;
  liked_page: string;
  elite_page: string;
  settings_page: string; 
}



export interface PlayControlActions {
  toggle_play: string;
  step_backward: string;
  step_forward: string;
  volume_up: string;
  volume_down: string;
  rotate_video: string;
  play_next: string;
  toggle_sidebar: string;
}

export interface CaptureActions {
  screenshot: string;
  export_screenshot: string;
  export_screenshot_with_dialog: string;
  record_clip: string;
  cancel_record: string;
}

export interface InteractActions {
  like: string;
  favorite: string;
}

export interface EditTagActions {
  toggle_track: string;
  cut_segment: string;
  merge_segments: string;
  create_tag_from_selection: string;
  open_assign_tag_dialog: string;
  quick_tag_1: string;
  quick_tag_2: string;
}

export interface SystemActions {
  refresh: string;
  soft_delete: string;
  open_video_dir: string,
}

/**
 * 2. 快捷键配置的总结构
 */
export interface KeyBindingsConfig {
  global: {
    view_nav: ViewNavActions;
    play_control: PlayControlActions;
    capture: CaptureActions;
    interact: InteractActions;
    edit_tag: EditTagActions;
    system: SystemActions;
  };
  dialog_assign_tag: {
    quick_assign_tags: Record<string, string>; // 比如 slot_1, slot_2...
    system: {
      confirm: string;
      cancel: string;
    };
  };
}

/**
 * 3. 核心黑魔法：提取所有属性名为一个联合类型
 * 这样 AppAction 就变成了 'toggle_play' | 'list_history' | 'screenshot' ...
 */
export type AppAction =
  | keyof ViewNavActions
  | keyof PlayControlActions
  | keyof CaptureActions
  | keyof InteractActions
  | keyof EditTagActions
  | keyof SystemActions
  | 'confirm' | 'cancel' | string; // 允许部分特殊或动态 key


/**
 * 2. 用户偏好相关设置 (存储在 preferences.json)
 */
export interface PreferenceSettings {
  // 播放参数
  playback: {
    global_volume: number;
    like_decay_rate: number;
    default_rate?: number;
  };
  // 跳帧预览逻辑
  skip_frame: {
    skip_duration: number;
    rules: Record<string, number>;
  };
  // 快捷键配置
  key_bindings: KeyBindingsConfig; // KeyBindingsConfig 保持你之前的定义
}