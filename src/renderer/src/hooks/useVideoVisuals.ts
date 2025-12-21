import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

interface UseVideoVisualsProps {
    // 【修改】允许泛型中包含 null，以兼容 useRef<HTMLVideoElement | null>(null)
    videoRef: RefObject<HTMLVideoElement | null>; 
    containerRef: RefObject<HTMLDivElement | null>;
    rotation: number;
}

export function useVideoVisuals({ videoRef, containerRef, rotation }: UseVideoVisualsProps) {
    const [visualRotation, setVisualRotation] = useState<number>(rotation);
    const prevRotationRef = useRef(rotation);
    
    // 尺寸状态
    const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

    // 1. 监听容器尺寸变化
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            setContainerDimensions({
                width: container.offsetWidth,
                height: container.offsetHeight,
            });
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [containerRef]);

    // 2. 核心缩放算法
    const calculateScale = useCallback(() => {
        const cw = containerDimensions.width;
        const ch = containerDimensions.height;
        const vw = videoDimensions.width;
        const vh = videoDimensions.height;

        if (!cw || !ch || !vw || !vh) return 1;
        if (rotation % 180 === 0) return 1; // 0 或 180 度不需要特殊缩放

        const videoAspectRatio = vw / vh;
        const containerAspectRatio = cw / ch;

        let renderedVideoWidth, renderedVideoHeight;

        // 旋转 90/270 度后的逻辑：宽高互换计算
        if (videoAspectRatio > containerAspectRatio) {
            renderedVideoWidth = cw;
            renderedVideoHeight = cw / videoAspectRatio;
        } else {
            renderedVideoHeight = ch;
            renderedVideoWidth = ch * videoAspectRatio;
        }

        return Math.min(cw / renderedVideoHeight, ch / renderedVideoWidth);
    }, [rotation, videoDimensions, containerDimensions]);

    // 3. 处理旋转动画平滑过渡
    useEffect(() => {
        const prevRotation = prevRotationRef.current;
        if (rotation === prevRotation + 90) setVisualRotation(visualRotation + 90);
        else if (rotation === 0 && prevRotation === 270) setVisualRotation(visualRotation + 90);
        else if (rotation === prevRotation - 90) setVisualRotation(visualRotation - 90);
        else if (rotation === 270 && prevRotation === 0) setVisualRotation(visualRotation - 90);
        else setVisualRotation(rotation);
        
        prevRotationRef.current = rotation;
    }, [rotation]);

    // 4. 应用样式
    useEffect(() => {
        if (videoRef.current) {
            const scale = calculateScale();
            videoRef.current.style.transform = `rotate(${visualRotation}deg) scale(${scale})`;
        }
    }, [visualRotation, calculateScale, videoRef]);

    // 暴露给 Video 的回调
    const onLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            setVideoDimensions({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
            });
        }
    }, [videoRef]);

    return { 
        visualRotation, 
        onLoadedMetadata 
    };
}