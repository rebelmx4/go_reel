// src/renderer/src/hooks/useVideoData.ts

import { useEffect, RefObject } from 'react';
import { usePlayerStore, useVideoFileRegistryStore, usePlaylistStore } from '../../stores';
import { VideoMetadata } from '../../../../shared/models'

/**
 * 视频数据同步 Hook
 * 职责：
 * 1. 当视频路径变化时，从 Registry 同步注解信息（如旋转）到播放器
 * 2. 异步获取视频的物理帧率（FPS）
 */
export function useVideoData(videoRef: RefObject<HTMLVideoElement | null>) {
  // 从各个 Store 获取所需的 Action 和数据
  const currentPath = usePlaylistStore((state) => state.currentPath);
  const setFramerate = usePlayerStore((state) => state.setFramerate);
  const setRotation = usePlayerStore((state) => state.setRotation);

  // 获取当前视频在注册表中的档案
  const videoFile = useVideoFileRegistryStore((s) => 
    currentPath ? s.videos[currentPath] : null
  );

  useEffect(() => {
    if (!currentPath || !videoRef.current) return;

    // --- 1. 同步旋转角度 ---
    const savedRotation = videoFile?.annotation?.rotation ?? 0;
    setRotation(savedRotation);

    // --- 2. 获取物理帧率 ---
    // 帧率通常需要 ffmpeg 实时读取，如果 Registry 里没存，则在这里获取一次
    const loadTechnicalMetadata = async () => {
      try {
        const metadata = await window.api.getVideoMetadata(currentPath);
        if (metadata && metadata.framerate) {
          setFramerate(metadata.framerate);
        }
      } catch (error) {
        console.error("[useVideoData] Failed to load framerate:", error);
        setFramerate(30); // 容错处理
      }
    };

    loadTechnicalMetadata();

    // --- 3. 强制重新加载视频源 ---
    // 虽然 <video src={...} /> 会处理切换，但调用 load() 可以确保内部状态重置
    videoRef.current.load();

  }, [currentPath, videoFile?.annotation?.rotation, setRotation, setFramerate, videoRef]);

  return { videoFile };
}