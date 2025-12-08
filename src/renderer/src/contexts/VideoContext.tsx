import { createContext, useContext, RefObject } from 'react';

interface VideoContextType {
    videoRef: RefObject<HTMLVideoElement | null> | null;
}

export const VideoContext = createContext<VideoContextType>({ videoRef: null });

export const useVideoContext = () => useContext(VideoContext);
