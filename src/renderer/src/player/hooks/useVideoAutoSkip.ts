// src/renderer/src/hooks/useVideoAutoSkip.ts
import { useEffect, useRef } from 'react';
import { useClipStore, usePlayerStore } from '../../stores';
import { useVideoContext } from '../contexts';

export function useVideoAutoSkip() {
    const { videoRef } = useVideoContext();
    
    // 从 ClipStore 获取裁剪数据
    const clips = useClipStore(state => state.clips);
    const isEditing = useClipStore(state => state.isEditing);

    // 从 PlayerStore 获取跳帧控制数据
    const skipFrameMode = usePlayerStore(state => state.skipFrameMode);
    const stepMode = usePlayerStore(state => state.stepMode);
    const duration = usePlayerStore(state => state.duration);

    // 使用 Ref 记录上一次“锚点”时间（用于计算 2s 间隔）
    const lastAnchorTime = useRef<number>(0);
    
    // 硬编码停留时间
    const SKIP_DURATION = 2;

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // --- 逻辑 A：处理手动拖拽 ---
        // 当用户手动调整进度条时，重置锚点，防止松手后立即跳帧
        const handleSeeking = () => {
            lastAnchorTime.current = video.currentTime;
        };

        const handleTimeUpdate = () => {
            if (isEditing) return;

            const currentTime = video.currentTime;

            // 1. 【高优先级】裁剪跳过逻辑 (原逻辑)
            // 查找当前时间是否在被标记为 remove 的片段中
            if (clips.length > 0) {
                const currentClip = clips.find(c => 
                    currentTime >= c.startTime && currentTime < (c.endTime - 0.1)
                );

                if (currentClip && currentClip.state === 'remove') {
                    const nextKeepClip = clips.find(c => 
                        c.startTime >= currentClip.endTime && c.state === 'keep'
                    );
                    
                    if (nextKeepClip) {
                        video.currentTime = nextKeepClip.startTime;
                        lastAnchorTime.current = nextKeepClip.startTime; // 跳过裁剪区后重置跳帧锚点
                        return; // 裁剪跳转优先，本次 update 不再处理跳帧
                    } else {
                        video.pause();
                        return;
                    }
                }
            }

            // 2. 【低优先级】跳帧播放逻辑
            // 条件：开启跳帧模式、时长 >= 60s、步进单位是数字(秒)
            if (
                skipFrameMode && 
                duration >= 60 && 
                typeof stepMode === 'number'
            ) {
                // 计算当前播放时间距离上一个锚点是否超过了 2s
                const timeDiff = currentTime - lastAnchorTime.current;

                if (timeDiff >= SKIP_DURATION) {
                    // 执行跳跃：当前时间 + 步进秒数
                    const targetTime = currentTime + stepMode;
                    
                    // 边界保护：如果跳跃后超过总时长，由 video 原生 ended 事件处理，这里直接跳
                    video.currentTime = targetTime;
                    
                    // 更新锚点为跳转后的时间
                    lastAnchorTime.current = targetTime;
                } 
                // 如果用户往回拖动（currentTime < lastAnchorTime），也重置锚点
                else if (timeDiff < 0) {
                    lastAnchorTime.current = currentTime;
                }
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('seeking', handleSeeking);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('seeking', handleSeeking);
        };
    }, [clips, isEditing, skipFrameMode, stepMode, duration, videoRef]);
}