// src/renderer/src/components/contexts/VideoContext.tsx
import { createContext, useContext, RefObject, useRef, useState, useEffect, ReactNode } from 'react';
import { usePlaylistStore } from '../../stores';

interface VideoMetadata {
    width: number;
    height: number;
    aspectRatio: number;
    isLoaded: boolean;
}

interface VideoContextType {
    videoRef: RefObject<HTMLVideoElement | null>;
    containerRef: RefObject<HTMLDivElement | null>;
    metadata: VideoMetadata;
    setMetadata: (data: Partial<VideoMetadata>) => void;
}

export const VideoContext = createContext<VideoContextType | null>(null);

export function VideoProvider({ children }: { children: ReactNode }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentPath = usePlaylistStore(state => state.currentPath);

    const [metadata, setMetadataState] = useState<VideoMetadata>({
        width: 1920,
        height: 1080,
        aspectRatio: 16 / 9,
        isLoaded: false
    });

    // 逻辑 A：监视路径变化 -> 重置状态
    useEffect(() => {
        setMetadataState(prev => ({
            ...prev,
            isLoaded: false
        }));
    }, [currentPath]);

    // 逻辑 B：监视 DOM 挂载 -> 永久监听原生事件
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const handleMetadata = () => {
            const { videoWidth, videoHeight } = videoElement;
            if (videoWidth > 0 && videoHeight > 0) {
                console.log('[VideoContext] Intrinsic Metadata Updated:', videoWidth, videoHeight);
                setMetadataState({
                    width: videoWidth,
                    height: videoHeight,
                    aspectRatio: videoWidth / videoHeight,
                    isLoaded: true
                });
            }
        };

        // 1. 绑定原生监听：HTML5 video 只要不销毁，更换 src 后会再次触发此事件
        videoElement.addEventListener('loadedmetadata', handleMetadata);

        // 2. 补漏逻辑：如果视频加载极快（如缓存），在 Effect 运行前 metadata 就好了
        if (videoElement.readyState >= 1) {
            handleMetadata();
        }

        // 3. 清理：仅在整个 Provider 被卸载时执行
        return () => {
            videoElement.removeEventListener('loadedmetadata', handleMetadata);
        };
    }, []); // 依赖项为空，保证只在挂载时执行一次

    const setMetadata = (data: Partial<VideoMetadata>) => {
        setMetadataState(prev => ({ ...prev, ...data }));
    };

    return (
        <VideoContext.Provider value={{ videoRef, containerRef, metadata, setMetadata }}>
            {children}
        </VideoContext.Provider>
    );
}

/**
 * 方便外部消费的 Hook
 */
export const useVideoContext = () => {
    const context = useContext(VideoContext);
    if (!context) {
        throw new Error('useVideoContext 必须在 VideoProvider 中使用');
    }
    return context;
};