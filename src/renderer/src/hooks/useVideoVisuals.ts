import { useState, useEffect, useCallback, useRef, RefObject, useLayoutEffect } from 'react';

interface UseVideoVisualsProps {
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

    // 1. 使用 useLayoutEffect 在 DOM 挂载后立即同步获取一次尺寸
    // 这样可以避免第一帧 cw/ch 为 0
    useLayoutEffect(() => {
        if (containerRef.current) {
            setContainerDimensions({
                width: containerRef.current.offsetWidth,
                height: containerRef.current.offsetHeight,
            });
        }
    }, [containerRef]);

    // 2. 监听容器尺寸后续变化
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                // 使用 borderBoxSize 或 contentRect
                setContainerDimensions({
                    width: entry.contentRect.width || container.offsetWidth,
                    height: entry.contentRect.height || container.offsetHeight,
                });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [containerRef]);

    // 3. 核心缩放算法 (改回由 state 驱动的计算)
    const calculateScale = useCallback(() => {
        // 优先从 state 拿，如果 state 还没更新（为 0），尝试直接从 Ref 拿
        const cw = containerDimensions.width || containerRef.current?.offsetWidth || 0;
        const ch = containerDimensions.height || containerRef.current?.offsetHeight || 0;
        const vw = videoDimensions.width || videoRef.current?.videoWidth || 0;
        const vh = videoDimensions.height || videoRef.current?.videoHeight || 0;

        if (!cw || !ch || !vw || !vh) return 1;
        if (rotation % 180 === 0) return 1;

        const videoAspectRatio = vw / vh;
        const containerAspectRatio = cw / ch;

        let renderedVideoWidth, renderedVideoHeight;

        if (videoAspectRatio > containerAspectRatio) {
            renderedVideoWidth = cw;
            renderedVideoHeight = cw / videoAspectRatio;
        } else {
            renderedVideoHeight = ch;
            renderedVideoWidth = ch * videoAspectRatio;
        }

        // 旋转 90/270 度时的缩放因子
        return Math.min(cw / renderedVideoHeight, ch / renderedVideoWidth);
    }, [rotation, videoDimensions, containerDimensions, containerRef, videoRef]);

    // 4. 处理旋转动画平滑过渡 (同旧代码)
    useEffect(() => {
        const prevRotation = prevRotationRef.current;
        if (rotation === prevRotation + 90) setVisualRotation(visualRotation + 90);
        else if (rotation === 0 && prevRotation === 270) setVisualRotation(visualRotation + 90);
        else if (rotation === prevRotation - 90) setVisualRotation(visualRotation - 90);
        else if (rotation === 270 && prevRotation === 0) setVisualRotation(visualRotation - 90);
        else setVisualRotation(rotation);
        
        prevRotationRef.current = rotation;
    }, [rotation]);

    // 5. 应用样式 (参考 old_players.ts 的核心逻辑)
    // 确保在任何尺寸或旋转变化时，都直接操作 style 保证最高优先级
    useEffect(() => {
        if (videoRef.current) {
            const scale = calculateScale();
            videoRef.current.style.transform = `rotate(${visualRotation}deg) scale(${scale})`;
        }
    }, [visualRotation, calculateScale, videoRef]);

    // 暴露给 Video 的回调
    const onVisualLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            setVideoDimensions({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
            });
            // 强制触发一次容器尺寸检查
            if (containerRef.current) {
                setContainerDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            }
        }
    }, [videoRef, containerRef]);

    return { 
        visualRotation, 
        onVisualLoadedMetadata 
    };
}