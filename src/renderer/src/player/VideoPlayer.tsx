import { VideoContext } from './contexts';
import { useRef } from 'react';
import { VideoPlayerContent } from './VideoPlayerContent';


export const VideoPlayer = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <VideoContext.Provider value={{ videoRef, containerRef }} >
            <VideoPlayerContent />
        </VideoContext.Provider >
    );
};