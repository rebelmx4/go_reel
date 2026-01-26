import { useIntersection, useClickOutside } from '@mantine/hooks';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Image, ActionIcon, Group, Tooltip, Paper, Text, Stack, Portal } from '@mantine/core';
import { IconHeart, IconHeartFilled, IconStar, IconStarFilled } from '@tabler/icons-react';
import { IconFolderOpen, IconTrash, IconX } from '@tabler/icons-react';
import { VideoFile } from '../../../../shared/models';
import { useFileActions } from '../../hooks/useFileActions';

interface VideoCardProps {
    video: VideoFile;
    isSelected: boolean;
    onClick?: (e: React.MouseEvent) => void;
    onPlay: (video: VideoFile) => void;
    onToggleLike?: (video: VideoFile) => void;
    onToggleElite?: (video: VideoFile) => void;
}

export function VideoCard({ video, isSelected, onClick, onPlay, onToggleLike, onToggleElite }: VideoCardProps) {
    const [coverUrl, setCoverUrl] = useState<string>('');
    const { handleShowInExplorer, handleDelete } = useFileActions();
    const [isLoadingCover, setIsLoadingCover] = useState(true);

    // 状态管理
    const [isHovered, setIsHovered] = useState(false);
    const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const playDelayRef = useRef<NodeJS.Timeout | null>(null);
    const menuRef = useClickOutside(() => setMenuPos(null));

    const videoSrc = useMemo(() => `file:///${video.path.replace(/\\/g, '/')}`, [video.path]);
    const isLiked = (video.annotation?.like_count ?? 0) > 0;
    const isFavorite = !!video.annotation?.is_favorite;

    // 交叉观察器（懒加载封面）
    const { ref: containerRef, entry } = useIntersection({ threshold: 0.1 });
    const [hasBeenVisible, setHasBeenVisible] = useState(false);
    useEffect(() => { if (entry?.isIntersecting) setHasBeenVisible(true); }, [entry?.isIntersecting]);

    const coverVersion = video.coverVersion;
    useEffect(() => {
        if (!hasBeenVisible) return;

        window.api.getCover(video.path).then(url => {
            if (url) {
                // 如果有版本标记，拼接参数破解浏览器缓存
                const finalUrl = coverVersion ? `${url}?v=${coverVersion}` : url;
                setCoverUrl(finalUrl);
            }
            setIsLoadingCover(false);
        });
        // 依赖项加入 coverVersion
    }, [video.path, hasBeenVisible, coverVersion]);

    useEffect(() => {
        if (!hasBeenVisible) return;
        window.api.getCover(video.path).then(url => {
            setCoverUrl(url);
            setIsLoadingCover(false);
        });
    }, [video.path, hasBeenVisible]);

    // --- 核心逻辑：播放控制 ---

    const startHover = () => {
        hoverTimeoutRef.current = setTimeout(() => setIsHovered(true), 150);
    };

    const stopHover = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        if (playDelayRef.current) clearTimeout(playDelayRef.current);
        setIsHovered(false); // 这会直接卸载视频组件，确保停止播放
    };

    // 正常播放时同步进度条 (原生操作)
    const syncProgress = () => {
        const video = videoRef.current;
        const bar = progressBarRef.current;
        if (video && bar && video.duration) {
            const pct = (video.currentTime / video.duration) * 100;
            bar.style.width = `${pct}%`;
        }
    };

    // 高性能搓碟 (Scrubbing)
    const handleScrubbing = (e: React.MouseEvent) => {
        const video = videoRef.current;
        const bar = progressBarRef.current;
        if (!video || !video.duration || !bar) return;

        // 1. 立即暂停，防止解码器在 Seek 时尝试播放导致卡顿
        if (!video.paused) video.pause();

        // 2. 计算位置并直接同步 currentTime 和 DOM
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = x / rect.width;

        video.currentTime = percent * video.duration;
        bar.style.width = `${percent * 100}%`;

        // 3. 停止移动后的自动播放逻辑 (防抖)
        if (playDelayRef.current) clearTimeout(playDelayRef.current);
        playDelayRef.current = setTimeout(() => {
            // 如果鼠标还在 Card 里，则恢复播放
            if (isHovered && video.paused) {
                video.play().catch(() => { });
            }
        }, 150);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuPos({ x: e.clientX, y: e.clientY });
    };

    return (
        <Tooltip label={video.path.split(/[\\/]/).pop()} position="top" openDelay={600}>
            <Box
                ref={containerRef}
                onMouseEnter={startHover}
                onMouseLeave={stopHover}
                onContextMenu={handleContextMenu}
                // --- 核心改动：单击选择，双击播放 ---
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(e);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    onPlay(video);
                }}
                // ------------------------------------
                style={{
                    position: 'relative',
                    borderRadius: 8,
                    overflow: 'hidden',
                    // 选中状态边框变色
                    border: isSelected
                        ? '2px solid var(--mantine-color-blue-6)'
                        : '2px solid #2C2E33',
                    cursor: 'pointer',
                    backgroundColor: '#000',
                    aspectRatio: '16/9',
                    // 选中时稍微增加阴影或缩放感
                    boxShadow: isSelected ? '0 0 10px rgba(34, 139, 230, 0.5)' : 'none',
                    transition: 'all 0.1s ease'
                }}
            >
                {isSelected && (
                    <Box style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(34, 139, 230, 0.1)',
                        pointerEvents: 'none',
                        zIndex: 2
                    }} />
                )}

                {/* 封面图 */}
                <Image
                    src={coverUrl}
                    height="100%"
                    fit="contain"
                    style={{
                        display: isHovered ? 'none' : 'block',
                        opacity: isLoadingCover ? 0.3 : 1,
                        transition: 'opacity 0.2s'
                    }}
                />

                {/* 视频预览层 */}
                {isHovered && (
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            position: 'absolute',
                            top: 0,
                            left: 0
                        }}
                        autoPlay
                        muted
                        loop
                        playsInline
                        onTimeUpdate={syncProgress}
                    />
                )}

                {/* 交互按钮 (右下角) */}
                <Group
                    gap={0}
                    style={{
                        position: 'absolute',
                        bottom: isHovered ? 16 : 0,
                        right: 0,
                        zIndex: 10,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        padding: '2px 4px',
                        borderTopLeftRadius: 8,
                        transition: 'bottom 0.1s ease',
                    }}
                >
                    <ActionIcon variant="subtle" size="sm" color={isLiked ? 'red' : 'white'} onClick={(e) => { e.stopPropagation(); onToggleLike?.(video); }}>
                        {isLiked ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
                    </ActionIcon>
                    <ActionIcon variant="subtle" size="sm" color={isFavorite ? 'yellow' : 'white'} onClick={(e) => { e.stopPropagation(); onToggleElite?.(video); }}>
                        {isFavorite ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                    </ActionIcon>
                </Group>

                {/* 精品标记 */}
                {isFavorite && (
                    <Box style={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#FFD700', color: '#000', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 'bold', zIndex: 5 }}>
                        精品
                    </Box>
                )}

                {/* 加高进度条 (Scrubbing 区域) */}
                {isHovered && (
                    <Box
                        onMouseMove={handleScrubbing}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 16, // 足够的高度方便鼠标操作
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            zIndex: 20,
                            cursor: 'ew-resize'
                        }}
                    >
                        <Box
                            ref={progressBarRef}
                            style={{
                                width: '0%',
                                height: '100%',
                                backgroundColor: '#228be6',
                                pointerEvents: 'none' // 避免干扰父级 mousemove
                            }}
                        />
                    </Box>
                )}

                {/* 右键菜单 */}
                {menuPos && (
                    <Portal>
                        {/* 遮罩：点击任意处关闭菜单 */}
                        <Box
                            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                            onClick={() => setMenuPos(null)}
                            onContextMenu={(e) => { e.preventDefault(); setMenuPos(null); }}
                        />
                        <Paper
                            ref={menuRef}
                            shadow="xl"
                            withBorder
                            style={{
                                position: 'fixed',
                                top: menuPos.y,
                                left: menuPos.x,
                                zIndex: 1000,
                                backgroundColor: '#1A1B1E',
                                padding: 4,
                                minWidth: 140,
                                border: '1px solid #373A40'
                            }}
                        >
                            <Stack gap={1}>
                                <MenuBtn icon={<IconFolderOpen size={16} />} label="打开文件夹" onClick={() => handleShowInExplorer(video.path)} />
                                <MenuBtn icon={<IconTrash size={16} />} label="移至待删除" color="red.5" onClick={() => handleDelete(video)} />
                                <Box style={{ height: 1, backgroundColor: '#373A40', margin: '4px 2px' }} />
                                <MenuBtn icon={<IconX size={16} />} label="取消菜单" onClick={() => setMenuPos(null)} />
                            </Stack>
                        </Paper>
                    </Portal>
                )}
            </Box>
        </Tooltip>
    );
}

function MenuBtn({ icon, label, onClick, color }: any) {
    return (
        <Group
            gap={10} px="sm" py={8}
            style={{ cursor: 'pointer', borderRadius: 4 }}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2C2E33')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
            <Box style={{ color: color ? 'var(--mantine-color-red-5)' : '#A6A7AB', display: 'flex' }}>{icon}</Box>
            <Text size="sm" c={color || 'gray.3'}>{label}</Text>
        </Group>
    );
}