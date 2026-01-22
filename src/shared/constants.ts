import { Annotation } from './models';
import { PreferenceSettings } from './settings.schema';

/**
 * Annotation 默认初始状态
 */
export const DEFAULT_ANNOTATION: Annotation = {
  like_count: 0,
  is_favorite: false,
  rotation: 0,
  screenshot_rotation: null,
  tags: []
};

/**
 * AppSettings 默认配置
 */
export const DEFAULT_SETTINGS: PreferenceSettings = {
  playback: {
    global_volume: 80,
    like_decay_rate: 0.2,
    default_rate: 1.0, 
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
        history_page: '1',
        newest_page: '2',
        search_page: '3',
        tag_search_page: '4',
        liked_page: '5',
        elite_page: '6',
        settings_page: '8',
        player_page: 'Esc',
      },
      play_control: {
        toggle_play: 'Space',
        step_backward: 'ArrowLeft',
        step_forward: 'ArrowRight',
        volume_up: 'W',
        volume_down: 'S',
        rotate_video: 'R',
        play_next: "PageDown",
        toggle_sidebar:  "PageUp"
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