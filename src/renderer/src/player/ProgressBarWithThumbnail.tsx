import { useRef, useState, useEffect } from 'react';
import { Box } from '@mantine/core';
import { usePlayerStore, useClipStore } from '../stores';

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
    const fillingBarRef = useRef<HTMLDivElement>(null); // 直接操作进度条填充 DOM

    // --- Store 数据订阅 ---
    const clips = useClipStore(state => state.clips);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const setPlaying = usePlayerStore(state => state.setPlaying);
    const isHoverSeekMode = usePlayerStore(state => state.isHoverSeekMode);
    const currentTime = usePlayerStore(state => state.currentTime);
    const duration = usePlayerStore(state => state.duration);

    // --- 内部持久化引用 ---
    const wasPlayingRef = useRef(false);
    const playDelayRef = useRef<number | null>(null);

    // 预览框 UI 状态 (仅控制缩略图位置，主进度条使用 Ref 操作)
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
    // 当不在磁吸模式或者鼠标没进入时，由 currentTime 驱动
    useEffect(() => {
        if (!showThumbnail && fillingBarRef.current && duration > 0) {
            const pct = (currentTime / duration) * 100;
            fillingBarRef.current.style.width = `${pct}%`;
        }
    }, [currentTime, duration, showThumbnail]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const progress = progressRef.current;
        const thumbVideo = thumbnailVideoRef.current;
        const fillingBar = fillingBarRef.current;

        if (!progress || !duration) return;

        const rect = progress.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const time = percentage * duration;

        // --- 高性能操作：不经过 React State ---

        // 1. 更新缩略图位置和时间文字 (这些更新较轻量，保留 State)
        setThumbnailPosition(x);
        setThumbnailTime(time);

        // 2. 同步缩略图视频进度
        if (thumbVideo && thumbVideo.readyState >= 1) {
            thumbVideo.currentTime = time;
        }

        // 3. 磁吸模式下的实时交互
        if (isHoverSeekMode) {
            // 直接操作主视频 DOM (onSeek 内部通常是 video.currentTime = time)
            onSeek(time);

            // 直接操作进度条填充宽度，实现 0 延迟反馈
            if (fillingBar) {
                fillingBar.style.width = `${percentage * 100}%`;
            }

            // 停止移动检测：自动恢复播放逻辑
            if (playDelayRef.current) window.clearTimeout(playDelayRef.current);
            playDelayRef.current = window.setTimeout(() => {
                // 如果鼠标还在轨道内，且进入前是在播放的，则恢复
                if (showThumbnail && wasPlayingRef.current) {
                    setPlaying(true);
                }
            }, 200) as unknown as number; // 200ms 停顿即视为“想看这里”
        }
    };

    const handleMouseEnter = () => {
        setShowThumbnail(true);
        if (isHoverSeekMode) {
            // 记录进入瞬间的播放状态
            wasPlayingRef.current = usePlayerStore.getState().isPlaying;
            // 如果正在播放，立即暂停以进入“搓碟”模式
            if (wasPlayingRef.current) {
                setPlaying(false);
            }
        }
    };

    const handleMouseLeave = () => {
        setShowThumbnail(false);
        if (isHoverSeekMode) {
            if (playDelayRef.current) window.clearTimeout(playDelayRef.current);
            // 离开时，如果之前在播放，恢复播放
            if (wasPlayingRef.current) {
                setPlaying(true);
            }
        }
    };

    const handleTrackClick = (e: React.MouseEvent) => {
        const rect = progressRef.current?.getBoundingClientRect();
        if (rect && duration) {
            const x = e.clientX - rect.left;
            const time = (x / rect.width) * duration;
            onSeek(time);
            if (isHoverSeekMode) {
                // 点击后更新状态：假设用户想从这里开始持续播放
                wasPlayingRef.current = true;
            }
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <Box style={{ position: 'relative', width: '100%' }}>
            {/* 缩略图预览框 */}
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
                    opacity: showThumbnail ? 1 : 0,
                    visibility: showThumbnail ? 'visible' : 'hidden',
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
                {/* 进度指示指示器 (使用 Ref 绑定) */}
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
                        // 强制关闭 transition 以实现磁吸模式下的极致响应
                        transition: 'none'
                    }}
                />

                {/* 渲染裁剪删除区 (保持不变) */}
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