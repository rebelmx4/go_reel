// src/renderer/src/hooks/useVideoAutoSkip.ts
import { useEffect } from 'react';
import { useClipStore } from '../../stores/clipStore';
import { useVideoContext } from '../contexts';

export function useVideoAutoSkip() {
    const { videoRef } = useVideoContext();
    const clips = useClipStore(state => state.clips);
    const isEditing = useClipStore(state => state.isEditing);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || isEditing || clips.length === 0) return;

        const handleTimeUpdate = () => {
            const currentTime = video.currentTime;
            // 查找当前时间是否在被标记为 remove 的片段中
            const currentClip = clips.find(c => currentTime >= c.startTime && currentTime < (c.endTime - 0.1));

            if (currentClip && currentClip.state === 'remove') {
                // 寻找下一个 keep 片段
                const nextKeepClip = clips.find(c => c.startTime >= currentClip.endTime && c.state === 'keep');
                if (nextKeepClip) {
                    video.currentTime = nextKeepClip.startTime;
                } else {
                    // 如果后面全是 remove，直接暂停在视频末尾或该片段末尾
                    video.pause();
                }
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [clips, isEditing, videoRef]);
}