// src/shared/types.ts

// 纯净的接口定义
export interface Annotation {
  like_count: number;
  is_favorite: boolean;
  rotation: 0 | 90 | 180 | 270;
  screenshot_rotation: 0 | 90 | 180 | 270 | null;
  tags: number[];
}


export interface JoinedVideo {
  path: string;
  createdAt: number; 
  mtime: number;     
  size: number;      
  annotation?: Annotation;  
}


export interface StartupResult {
  videoList: JoinedVideo[];
  history: string[];
  settings: any;
}