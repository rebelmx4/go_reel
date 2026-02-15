import { Annotation } from './models'
import { PreferenceSettings } from './settings.schema'

/**
 * Annotation 默认初始状态
 */
export const DEFAULT_ANNOTATION: Annotation = {
  like_count: 0,
  is_favorite: false,
  rotation: 0,
  screenshot_rotation: null,
  tags: []
}

// 定义步进值：'frame' 或 秒数 (1, 5, 10, 30, 60, 90, 120, 300, 600)
export type StepValue = 'frame' | 1 | 5 | 10 | 30 | 60 | 90 | 120 | 300 | 600

export const STEP_OPTIONS: StepValue[] = ['frame', 1, 5, 10, 30, 60, 90, 120, 300, 600]

/**
 * 智能梯度配置：视频时长(秒) -> 推荐的步进值
 */
export const DEFAULT_STEP_GRADIENT: { threshold: number; step: StepValue }[] = [
  { threshold: 60, step: 1 }, // 1分钟内：用帧
  { threshold: 300, step: 5 }, // 5分钟内：用5s
  { threshold: 900, step: 10 }, // 15分钟内：用10s
  { threshold: 1800, step: 30 }, // 30分钟内：用30s
  { threshold: 3600, step: 60 }, // 1小时内：用1m
  { threshold: 5400, step: 90 }, // 1.5小时内：用1.5m
  { threshold: 7200, step: 120 }, // 2小时内：用2m
  { threshold: 18000, step: 300 }, // 5小时内：用5m
  { threshold: Infinity, step: 600 } // 更长：用10m
]

/**
 * AppSettings 默认配置
 * 注意：所有 key_bindings 现在的取值都是 string[]
 */
export const DEFAULT_SETTINGS: PreferenceSettings = {
  playback: {
    global_volume: 80,
    like_decay_rate: 0.2,
    default_rate: 1.0
  },
  skip_frame: {
    skip_duration: 2,
    rules: {
      '60s': 0,
      '30m': 10,
      '120m': 30,
      '10000m': 60
    }
  },
  key_bindings: {
    global: {
      view_nav: {
        history_page: ['1'],
        newest_page: ['2'],
        search_page: ['3'],
        tag_search_page: ['4'],
        liked_page: ['5'],
        elite_page: ['6'],
        settings_page: ['8'],
        player_page: ['Esc'],
        folder_page: [],
        tag_manage_page: [],
        multi_player_page: [],
        screenshot_manage_page: []
      },
      play_control: {
        toggle_play: ['Space'],
        step_backward: ['ArrowLeft', 'A'],
        step_forward: ['ArrowRight', 'D'],
        volume_up: ['W', 'ArrowUp'],
        volume_down: ['S', 'ArrowDown'],
        rotate_video: ['R'],
        play_next: ['PageDown'],
        toggle_sidebar: ['PageUp'],
        toggle_skip_frame_mode: ['V'],
        toggle_hover_seek_mode: ['H'],
        switch_sidebar_newest: ['Alt+1'],
        switch_sidebar_elite: ['Alt+2'],
        switch_sidebar_history: ['Alt+3'],
        switch_sidebar_assign_tag: ['Alt+4'],
        switch_sidebar_tag_search: ['Alt+5'],
        switch_sidebar_transcode: ['Alt+6'],
        switch_sidebar_liked: ['Alt+7']
      },
      capture: {
        screenshot: ['E'],
        export_screenshot: ['Ctrl+E'],
        export_screenshot_with_dialog: ['Alt+E'],
        record_clip: ['K'],
        cancel_record: ['Shift+K']
      },
      interact: {
        like: ['F'],
        favorite: ['Shift+F']
      },
      edit_tag: {
        toggle_track: ['Tab'],
        cut_segment: ['Q'],
        merge_segments: ['Shift+Q'],
        create_tag_from_selection: ['T'],
        open_assign_tag_dialog: ['Shift+G'],
        quick_tag_1: ['Alt+1'],
        quick_tag_2: ['Alt+2']
      },
      system: {
        refresh: ['F5'],
        soft_delete: ['Ctrl+Delete'],
        open_video_dir: ['Ctrl+Shift+O']
      }
    },
    dialog_assign_tag: {
      quick_assign_tags: {
        slot_1: ['1'],
        slot_2: ['2'],
        slot_3: ['3'],
        slot_4: ['4'],
        slot_5: ['5'],
        slot_6: ['Q'],
        slot_7: ['W'],
        slot_8: ['E'],
        slot_9: ['R'],
        slot_10: ['~']
      },
      system: {
        confirm: ['Enter'],
        cancel: ['Esc']
      }
    }
  }
}
