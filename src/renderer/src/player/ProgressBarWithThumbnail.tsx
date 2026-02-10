// --- START OF FILE ProgressBarWithThumbnail.tsx ---

import { useRef, useState, useEffect } from 'react';
import { Box } from '@mantine/core';
import { usePlayerStore, useClipStore } from '../stores';
import { useVideoContext } from './contexts'; // 引入 Context 获取 videoRef
import { usePlayerActions } from './hooks/usePlayerActions'; // 引入 Actions

interface ProgressBarWithThumbnailProps {
    videoPath: string | null;
    onSeek: (time: number) => void;
}

export function ProgressBarWithThumbnail({
    videoPath,
    onSeek
}: ProgressBarWithThumbnailProps) {
    const progressRef = useRef<HTMLDivElement>(null);
    const thumbnailVideoRef = useRef<HTMLVideoElement>(null);
    const fillingBarRef = useRef<HTMLDivElement>(null);

    // --- Store 数据 ---
    const clips = useClipStore(state => state.clips);
    // 注意：不再需要 setPlaying，只需要读取状态用于渲染进度条
    const isHoverSeekMode = usePlayerStore(state => state.isHoverSeekMode);
    const setIsScrubbing = usePlayerStore(state => state.setIsScrubbing);
    const currentTime = usePlayerStore(state => state.currentTime);
    const duration = usePlayerStore(state => state.duration);

    // --- Context & Actions ---
    const { videoRef } = useVideoContext(); // 直接获取主视频 Ref 用于读取状态
    const { playVideo, pauseVideo } = usePlayerActions(); // 使用统一的控制函数

    // --- 内部状态 ---
    const wasPlayingRef = useRef(false);

    // 预览框 UI 状态
    const [showThumbnail, setShowThumbnail] = useState(false);
    const [thumbnailPosition, setThumbnailPosition] = useState(0);
    const [thumbnailTime, setThumbnailTime] = useState(0);

    // 1. 初始化加载缩略图视频
    useEffect(() => {
        const video = thumbnailVideoRef.current;
        if (video && videoPath) {
            const fileUrl = `file:///${videoPath.replace(/\\/g, '/')}`;
            video.src = fileUrl;
            video.load();
        }
    }, [videoPath]);

    // 2. 正常播放时，同步 fillingBar 的宽度
    useEffect(() => {
        // 只有当不显示缩略图（意味着不在交互中）或者 不在磁吸模式下时，才由 Store 驱动
        // 简单的逻辑：只要没在手动 Seek，就跟着 currentTime 走
        if (!showThumbnail && fillingBarRef.current && duration > 0) {
            const pct = (currentTime / duration) * 100;
            fillingBarRef.current.style.width = `${pct}%`;
        }
    }, [currentTime, duration, showThumbnail]);

    // --- 核心交互逻辑 ---

    const handleMouseEnter = () => {
        if (!videoRef.current) return;

        if (isHoverSeekMode) {
            // === 体验 B：磁吸模式 ===
            // 1. 记录进入前的真实物理状态 (而不是 Store 里的状态，那样可能有延迟)
            wasPlayingRef.current = !videoRef.current.paused;

            setIsScrubbing(true);

            const v = videoRef.current;
            if (v) v.pause(); // 这里直接操作 DOM 绕过 actions 的拦截

            // 3. 磁吸模式下不显示缩略图
            setShowThumbnail(false);
        } else {
            // === 体验 A：预览模式 ===
            // 只显示缩略图，不影响主视频播放
            setShowThumbnail(true);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const progress = progressRef.current;
        const thumbVideo = thumbnailVideoRef.current;
        const fillingBar = fillingBarRef.current;

        if (!progress || !duration) return;

        const rect = progress.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const time = percentage * duration;

        if (isHoverSeekMode) {
            // === 体验 B：磁吸模式 ===
            // 1. 直接修改主视频时间 (scrubbing)
            onSeek(time);

            // 2. 实时更新进度条 UI (0延迟)
            if (fillingBar) {
                fillingBar.style.width = `${percentage * 100}%`;
            }
            // 不需要更新缩略图
        } else {
            // === 体验 A：预览模式 ===
            // 1. 更新缩略图位置和时间
            setThumbnailPosition(x);
            setThumbnailTime(time);

            // 2. 同步缩略图视频进度
            if (thumbVideo && thumbVideo.readyState >= 1) {
                thumbVideo.currentTime = time;
            }
            // 不影响主视频
        }
    };

    const handleMouseLeave = () => {
        if (isHoverSeekMode) {
            setIsScrubbing(false);

            // 根据进入前的状态决定是否恢复
            if (wasPlayingRef.current) {
                const v = videoRef.current;
                if (v) v.play(); // 直接操作 DOM 恢复
            }
        } else {
            setShowThumbnail(false);
        }
    };

    const handleTrackClick = (e: React.MouseEvent) => {
        const rect = progressRef.current?.getBoundingClientRect();
        if (rect && duration) {
            const x = e.clientX - rect.left;
            const time = (x / rect.width) * duration;

            onSeek(time);

            if (isHoverSeekMode) {
                // 点击意味着用户确认了“就从这里看”
                // 通常交互是：点击后，更新“之前的状态”为播放，并立即播放
                wasPlayingRef.current = true;
                playVideo();
            }
            // 体验 A 模式下，onSeek 已经处理了跳转，主视频状态保持不变（若在播放则继续从新位置播，若暂停则在显示新位置）
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <Box style={{ position: 'relative', width: '100%' }}>
            {/* 缩略图预览框：只在非磁吸模式下，且 showThumbnail 为 true 时显示 */}
            <Box
                style={{
                    position: 'absolute',
                    bottom: 30,
                    left: thumbnailPosition,
                    transform: 'translateX(-50%)',
                    width: 240,
                    backgroundColor: '#000',
                    border: '2px solid #fff',
                    borderRadius: 4,
                    overflow: 'hidden',
                    zIndex: 100,
                    pointerEvents: 'none',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
                    opacity: (!isHoverSeekMode && showThumbnail) ? 1 : 0,
                    visibility: (!isHoverSeekMode && showThumbnail) ? 'visible' : 'hidden',
                    transition: 'opacity 0.1s ease-in-out'
                }}
            >
                <video
                    ref={thumbnailVideoRef}
                    muted
                    preload="auto"
                    style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        backgroundColor: '#000'
                    }}
                />
                <Box
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: '#fff',
                        fontSize: 12,
                        textAlign: 'center',
                        padding: '4px 0',
                        fontWeight: 'bold'
                    }}
                >
                    {formatTime(thumbnailTime)}
                </Box>
            </Box>

            {/* 进度条轨道 */}
            <Box
                ref={progressRef}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleTrackClick}
                style={{
                    height: 12,
                    backgroundColor: '#333',
                    borderRadius: 6,
                    cursor: 'pointer',
                    position: 'relative',
                    marginTop: '20px',
                }}
            >
                {/* 进度指示器 */}
                <Box
                    ref={fillingBarRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        // 初始宽度同步
                        width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                        backgroundColor: isHoverSeekMode ? '#ff922b' : '#ff0000',
                        borderRadius: 6,
                        pointerEvents: 'none',
                        zIndex: 1,
                        transition: isHoverSeekMode ? 'none' : 'width 0.1s linear'
                    }}
                />

                {/* 剪辑片段显示 (保持不变) */}
                {clips.filter(c => c.state === 'remove').map(clip => (
                    <Box
                        key={clip.id}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: `${(clip.startTime / duration) * 100}%`,
                            width: `${((clip.endTime - clip.startTime) / duration) * 100}%`,
                            height: '100%',
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            zIndex: 2,
                            pointerEvents: 'none',
                            backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.05) 75%, transparent 75%, transparent)',
                            backgroundSize: '10px 10px'
                        }}
                    />
                ))}
            </Box>
        </Box>
    );
}