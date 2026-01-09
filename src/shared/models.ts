// src/shared/types.ts
import { AppSettings } from './settings.schema'; 


// 纯净的接口定义
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
}


export interface StartupResult {
  videoList: VideoFile[];
  history: string[];
  settings: AppSettings;
}