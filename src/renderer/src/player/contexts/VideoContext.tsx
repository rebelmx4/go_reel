import { createContext, useContext, RefObject } from 'react';

interface VideoContextType {
    videoRef: RefObject<HTMLVideoElement | null>;
    containerRef: RefObject<HTMLDivElement | null>;
}

export const VideoContext = createContext<VideoContextType | null>(null);

export const useVideoContext = () => {
    const context = useContext(VideoContext);

    if (!context) {
        throw new Error('useVideoContext 必须在 VideoContext.Provider 中使用');
    }

    return context;
};