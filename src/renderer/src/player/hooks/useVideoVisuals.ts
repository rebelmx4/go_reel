import { useState, useEffect, useCallback, useRef } from 'react';
import { useVideoContext } from '../contexts';

interface UseVideoVisualsProps {
    rotation: number;
}

export function useVideoVisuals({ rotation }: UseVideoVisualsProps) {
    const { videoRef, containerRef } = useVideoContext();
    const [zoomLevel, setZoomLevel] = useState(0); // 0, 1, 2 分别代表三档
    const [visualRotation, setVisualRotation] = useState<number>(rotation);
    const prevRotationRef = useRef(rotation);

    // 1. 处理旋转动画平滑过渡 (保留原有逻辑)
    useEffect(() => {
        const prevRotation = prevRotationRef.current;
        if (rotation === prevRotation + 90) setVisualRotation(visualRotation + 90);
        else if (rotation === 0 && prevRotation === 270) setVisualRotation(visualRotation + 90);
        else if (rotation === prevRotation - 90) setVisualRotation(visualRotation - 90);
        else if (rotation === 270 && prevRotation === 0) setVisualRotation(visualRotation - 90);
        else setVisualRotation(rotation);
        prevRotationRef.current = rotation;
    }, [rotation]);

    // 2. 核心计算逻辑
    const getLayoutInfo = useCallback(() => {
        const v = videoRef.current;
        const c = containerRef.current;
        if (!v || !c || v.videoWidth === 0) return null;

        const cw = c.offsetWidth;
        const ch = c.offsetHeight;
        const vw = v.videoWidth;
        const vh = v.videoHeight;

        // 计算有效宽高（考虑旋转）
        const isRotated = rotation % 180 !== 0;
        const effectiveVw = isRotated ? vh : vw;
        const effectiveVh = isRotated ? vw : vh;

        // 计算 Contain 模式下的缩放比例
        const containScale = Math.min(cw / effectiveVw, ch / effectiveVh);
        
        // 原始分辨率对应的 scale 就是 1.0
        const originalScale = 1.0;

        // 判断是“大视频”还是“小视频”
        // 如果原始大小已经超过了 contain，说明是“大视频”
        const isSmallVideo = originalScale < containScale;

        let finalScale = 1.0;
        if (isSmallVideo) {
            // 小视频：三档逻辑
            const scales = [
                originalScale, // 档位 0: 1:1
                (originalScale + containScale) / 2, // 档位 1: 中间
                containScale // 档位 2: 恰好撑满
            ];
            finalScale = scales[zoomLevel];
        } else {
            // 大视频：根据需求“大于 contain 使用 contain”
            // 且因为最大只能是 contain，所以大视频锁定在 containScale
            finalScale = containScale;
        }

        return { finalScale, isSmallVideo };
    }, [rotation, zoomLevel, videoRef, containerRef]);

    // 3. 监听视频切换，重置缩放档位
    useEffect(() => {
        const info = getLayoutInfo();
        if (info) {
            // 如果是小视频，默认 0 (原始分辨率)；大视频默认 2 (Contain)
            setZoomLevel(info.isSmallVideo ? 0 : 2);
        }
    }, [videoRef.current?.src]); // 视频源改变时重置

    // 4. 应用样式
    useEffect(() => {
        const info = getLayoutInfo();
        if (videoRef.current && info) {
            videoRef.current.style.transform = `rotate(${visualRotation}deg) scale(${info.finalScale})`;
        }
    }, [visualRotation, getLayoutInfo]);

    // 5. 滚轮事件处理器
    const handleWheel = useCallback((e: React.WheelEvent) => {
        const info = getLayoutInfo();
        if (!info || !info.isSmallVideo) return; // 大视频或未加载时不响应滚轮

        if (e.deltaY < 0) {
            // 向上滚，放大
            setZoomLevel(prev => Math.min(2, prev + 1));
        } else {
            // 向下滚，缩小
            setZoomLevel(prev => Math.max(0, prev - 1));
        }
    }, [getLayoutInfo]);

    return { 
        onVisualLoadedMetadata: () => {
            const info = getLayoutInfo();
            if (info) setZoomLevel(info.isSmallVideo ? 0 : 2);
        },
        handleWheel
    };
}