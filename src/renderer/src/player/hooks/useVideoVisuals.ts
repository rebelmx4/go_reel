import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useVideoContext } from '../contexts';
import { usePlaylistStore } from '../../stores';

interface UseVideoVisualsProps {
    rotation: number;
}

export function useVideoVisuals({ rotation }: UseVideoVisualsProps) {
    const { videoRef, containerRef } = useVideoContext();
    const currentPath = usePlaylistStore(state => state.currentPath);

    const [zoomLevel, setZoomLevel] = useState(2); // 0: 1:1, 1: 中间, 2: Contain
    const [visualRotation, setVisualRotation] = useState<number>(rotation);
    const [isReady, setIsReady] = useState(false); // 关键：控制初始加载和计算时序
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    const prevRotationRef = useRef(rotation);

    // 1. 监听路径切换：完全重置状态
    useEffect(() => {
        setIsReady(false);
        setZoomLevel(2);
        
        const prevRotation = prevRotationRef.current;
        if (rotation === 0 && prevRotation === 270) setVisualRotation(visualRotation + 90);
        else if (rotation === 270 && prevRotation === 0) setVisualRotation(visualRotation - 90);
        else setVisualRotation(rotation);
        
        prevRotationRef.current = rotation;
    }, [currentPath, rotation]);

    // 2. 监听容器尺寸变化 (处理窗口/侧边栏变动)
    useEffect(() => {
        const c = containerRef.current;
        if (!c) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });

        observer.observe(c);
        return () => observer.disconnect();
    }, [containerRef]);

    // 3. 核心布局计算逻辑
    const layout = useMemo(() => {
        const v = videoRef.current;
        // 只有当 Ready 且有尺寸时才计算，否则返回 null
        if (!v || !isReady || v.videoWidth === 0 || containerSize.width === 0) return null;

        const vw = v.videoWidth;
        const vh = v.videoHeight;
        const cw = containerSize.width;
        const ch = containerSize.height;

        // 计算目标方向下的有效尺寸 (基于 Store 的目标 rotation)
        const isRotated = rotation % 180 !== 0;
        const effectiveVw = isRotated ? vh : vw;
        const effectiveVh = isRotated ? vw : vh;

        // 计算 Contain 比例 (核心：让 effective 尺寸刚好装进容器)
        const containScale = Math.min(cw / effectiveVw, ch / effectiveVh);
        
        // 判定小视频：原始分辨率完全可以被容器装下
        const isSmallVideo = 1.0 < containScale;

        let finalScale = containScale;
        if (isSmallVideo) {
            const scales = [
                1.0, 
                (1.0 + containScale) / 2, 
                containScale
            ];
            finalScale = scales[zoomLevel];
        } else {
            // 大视频锁定在 Contain
            finalScale = containScale;
        }

        return { finalScale, isSmallVideo, vw, vh };
    }, [containerSize, rotation, zoomLevel, isReady]); // isReady 变化会强制触发重读 DOM 宽高

    // 4. 生成样式
    const videoStyle: React.CSSProperties = {
        display: 'block',
        maxWidth: 'none',
        pointerEvents: 'none',
        transformOrigin: 'center center',
        
        // 消除跳动：Ready 之前不可见且无过渡
        opacity: isReady && layout ? 1 : 0,
        transition: (isReady && layout) ? 'transform 0.2s ease-out, opacity 0.1s ease-out' : 'none',
        
        // 关键改进：显式设置像素宽高，防止 flex/百分比挤压
        width: layout?.vw ? `${layout.vw}px` : 'auto',
        height: layout?.vh ? `${layout.vh}px` : 'auto',
        
        transform: layout 
            ? `rotate(${visualRotation}deg) scale(${layout.finalScale})` 
            : 'scale(0)' // 未准备好时设为 0
    };

    // 5. 滚轮处理器
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!layout || !layout.isSmallVideo) return;
        if (e.deltaY < 0) {
            setZoomLevel(prev => Math.min(2, prev + 1));
        } else {
            setZoomLevel(prev => Math.max(0, prev - 1));
        }
    }, [layout]);

    return {
        videoStyle,
        handleWheel,
        onVisualLoadedMetadata: () => {
            // Metadata 加载后，触发 React 重新渲染并计算布局
            setIsReady(true);
        }
    };
}