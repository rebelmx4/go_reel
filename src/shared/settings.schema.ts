/**
 * 1. 存储路径相关设置 (存储在 storage_paths.json)
 */
export interface StorageSettings {
  video_source: string;
  staged_path: string;
  screenshot_export_path: string;
}


type MultiKey = string | string[];
/**
 * 1. 定义具体的动作分类接口
 * 这里的属性名（Key）就是你在代码中直接使用的“变量名”/“动作名”
 */

export interface ViewNavActions {
  player_page: MultiKey;   
  history_page: MultiKey;
  newest_page: MultiKey;
  search_page: MultiKey;
  tag_search_page: MultiKey;
  liked_page: MultiKey;
  elite_page: MultiKey;
  settings_page: MultiKey; 
  folder_page: MultiKey;
  tag_manage_page: MultiKey;
  multi_player_page: MultiKey;
  screenshot_manage_page: MultiKey;
}



export interface PlayControlActions {
  toggle_play: MultiKey;
  step_backward: MultiKey;
  step_forward: MultiKey;
  volume_up: MultiKey;
  volume_down: MultiKey;
  rotate_video: MultiKey;
  play_next: MultiKey;
  toggle_sidebar: MultiKey;
  toggle_skip_frame_mode: MultiKey; 
}

export interface CaptureActions {
  screenshot: MultiKey;
  export_screenshot: MultiKey;
  export_screenshot_with_dialog: MultiKey;
  record_clip: MultiKey;
  cancel_record: MultiKey;
}

export interface InteractActions {
  like: MultiKey;
  favorite: MultiKey;
}

export interface EditTagActions {
  toggle_track: MultiKey;
  cut_segment: MultiKey;
  merge_segments: MultiKey;
  create_tag_from_selection: MultiKey;
  open_assign_tag_dialog: MultiKey;
  quick_tag_1: MultiKey;
  quick_tag_2: MultiKey;
}

export interface SystemActions {
  refresh: MultiKey;
  soft_delete: MultiKey;
  open_video_dir: MultiKey,
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
    quick_assign_tags: Record<string, MultiKey>; // 比如 slot_1, slot_2...
    system: {
      confirm: MultiKey;
      cancel: MultiKey;
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