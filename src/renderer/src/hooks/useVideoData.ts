import { useState, useEffect, RefObject } from 'react';
import { usePlayerStore, useHistoryStore } from '../stores';

// 【修改】使用 RefObject<HTMLVideoElement | null> 类型
export function useVideoData(videoRef: RefObject<HTMLVideoElement | null>) {
    const currentVideoPath = usePlayerStore((state) => state.currentVideoPath);
    const setFramerate = usePlayerStore((state) => state.setFramerate);
    const setRotation = usePlayerStore((state) => state.setRotation);
    
    const [currentVideoTags, setCurrentVideoTags] = useState<number[]>([]);

    // 1. 视频源加载与元数据读取
    useEffect(() => {
        if (videoRef.current && currentVideoPath) {
            const normalizedPath = currentVideoPath.replace(/\\/g, '/');
            videoRef.current.src = `file://${normalizedPath}`;
            videoRef.current.load();

            const loadMetadata = async () => {
                try {
                    // 加载帧率
                    const metadata = await window.api.getVideoMetadata(currentVideoPath);
                    setFramerate(metadata.framerate);

                    // 加载 Hash 和 旋转角度
                    const hash = await window.api.calculateVideoHash(currentVideoPath);
                    if (hash) {
                        const annotation = await window.api.getAnnotation(hash);
                        const savedRotation = (annotation?.rotation ?? 0) as 0 | 90 | 180 | 270;
                        setRotation(savedRotation);
                    }
                } catch (error) {
                    console.error("Failed to load video metadata:", error);
                }
            };
            loadMetadata();
        }
    }, [currentVideoPath, setFramerate, setRotation, videoRef]);

    // 2. 加载 Tags
    useEffect(() => {
        if (currentVideoPath && window.api?.loadVideoTags) {
            window.api.loadVideoTags(currentVideoPath).then(setCurrentVideoTags);
        }
    }, [currentVideoPath]);

    // 3. 记录历史
    useEffect(() => {
        if (currentVideoPath) {
            useHistoryStore.getState().addToHistory(currentVideoPath);
        }
    }, [currentVideoPath]);

    return { 
        currentVideoTags, 
        setCurrentVideoTags 
    };
}