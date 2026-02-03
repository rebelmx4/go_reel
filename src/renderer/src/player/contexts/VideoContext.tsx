import { createContext, useContext, RefObject, useState, useEffect } from 'react';

interface VideoContextType {
    videoRef: RefObject<HTMLVideoElement | null>;
    containerRef: RefObject<HTMLDivElement | null>;
    videoAspectRatio: number;
}

export const VideoContext = createContext<VideoContextType | null>(null);

export const VideoProvider = ({ children, videoRef, containerRef }: {
    children: React.ReactNode,
    videoRef: RefObject<HTMLVideoElement | null>,
    containerRef: RefObject<HTMLDivElement | null>
}) => {
    const [aspectRatio, setAspectRatio] = useState(16 / 9);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateMeta = () => {
            if (video.videoWidth && video.videoHeight) {
                setAspectRatio(video.videoWidth / video.videoHeight);
            }
        };

        video.addEventListener('loadedmetadata', updateMeta);
        if (video.readyState >= 1) updateMeta();

        return () => video.removeEventListener('loadedmetadata', updateMeta);
    }, [videoRef]);

    return (
        <VideoContext.Provider value={{ videoRef, containerRef, videoAspectRatio: aspectRatio }}>
            {children}
        </VideoContext.Provider>
    );
};

export const useVideoContext = () => {
    const context = useContext(VideoContext);
    if (!context) throw new Error('useVideoContext 必须在 VideoContext.Provider 中使用');
    return context;
};