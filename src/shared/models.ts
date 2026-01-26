import { PreferenceSettings } from './settings.schema'; 


export interface Annotation {
  like_count: number;
  is_favorite: boolean;
  rotation: 0 | 90 | 180 | 270;
  screenshot_rotation: 0 | 90 | 180 | 270 | null;
  tags: number[];
}


export interface VideoFile {
  path: string;
  createdAt: number; 
  mtime: number;     
  size: number;      
  annotation?: Annotation;  
  coverVersion?: number; 
}

export interface Tag {
  id: number;
  keywords: string;
  description?: string;
  imagePath: string;
}

export interface PinnedTag {
  tagId: number;
  position: number;
}

export interface TagLibrary {
  tagsData: Record<string, Tag[]>;
  pinnedTags: PinnedTag[];
}

export type HistoryStore = string[];

export interface StartupResult {
  videoList: VideoFile[];
  history: HistoryStore;
  preferenceStettings: PreferenceSettings;
  tagLibrary: TagLibrary; 
}

export interface VideoMetadata {
    duration: number; 
    width: number;
    height: number;
    framerate: number;
}

export interface VideoClip {
  id: string;      
  startTime: number;
  endTime: number;
  state: 'keep' | 'remove';
}