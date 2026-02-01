import { useCallback } from 'react';
import { usePlayerStore, useScreenshotStore, usePlaylistStore, useToastStore, useVideoFileRegistryStore, useClipStore } from '../../stores';
import {useVideoFrameCapture} from "./useVideoFrameCapture"
import { useVideoContext } from '../contexts';


export function usePlayerActions( ) {
    const { videoRef } = useVideoContext();

    const { showClipTrack, toggleClipTrack, currentTime } = usePlayerStore();
    const { clips, splitClip, mergeClip } = useClipStore();

    const currentPath = usePlaylistStore(state => state.currentPath);
    const playNextOriginal = usePlaylistStore(state => state.next);
     const playNext = useCallback(() => {
        playNextOriginal();
    }, [playNextOriginal]);

    

    const { rotation, setRotation, setPlaying, toggleSidebar, isPlaying, stepMode, framerate, 
        openAssignTagModal, openCreateTagModal} = usePlayerStore();

    const { captureManual } = useScreenshotStore();
    const { showToast } = useToastStore();
    const updateAnnotation = useVideoFileRegistryStore(s => s.updateAnnotation);
    const videoFile = useVideoFileRegistryStore(s => currentPath ? s.videos[currentPath] : null);
    const { captureFrame } = useVideoFrameCapture();

    const openAssignTag = useCallback(() => {
        // 暂停逻辑已经内聚在 Store 的 openAssignTagModal 里了，或者在这里显式调用也可以
        openAssignTagModal();
    }, [openAssignTagModal]);

    const openCreateTag = useCallback(() => {
        if (!videoRef.current) return;
        
        // 1. 截图 (业务逻辑)
        const frameBase64 = captureFrame(rotation);
        
        // 2. 打开弹窗并存入数据 (UI 状态更新)
        openCreateTagModal(frameBase64); 
    }, [videoRef, rotation, captureFrame, openCreateTagModal]);

    const stepFrame = useCallback((direction: 1 | -1) => {
        if (!videoRef.current) return;
        
        let skipSeconds = 0;
        if (stepMode === 'frame') {
            // 帧模式：1 / fps
            skipSeconds = 1 / framerate;
        } else {
            // 数值模式：stepMode 本身就是秒数 (1, 5, 10, 30, 60...)
            skipSeconds = stepMode as number;
        }
        
        videoRef.current.currentTime += direction * skipSeconds;
    }, [videoRef, stepMode, framerate]);

    const rotateVideo = useCallback(async () => {
        if (!currentPath) return;
        const newRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
        setRotation(newRotation);
        await updateAnnotation(currentPath, { rotation: newRotation });
    }, [rotation, currentPath, setRotation, updateAnnotation]);

    const takeScreenshot  = useCallback(async () => {
        if (!videoRef.current || !currentPath) return;
        const success = await captureManual(currentPath, videoRef.current.currentTime);
        if (success) showToast({ message: '截图成功', type: 'success' });
    }, [currentPath, captureManual, showToast, videoRef]);

    const softDelete = useCallback(async () => {
        if (!currentPath) return;
        const success = await window.api.moveToTrash(currentPath);
        if (success) {
            showToast({ message: '文件已移至待删除队列', type: 'success' });
            playNext();
        } else {
            showToast({ message: '操作失败', type: 'error' });
        }
    }, [currentPath, playNext, showToast]);

    const toggleFavorite = useCallback(async () => {
        if (!currentPath) return;
        const isFavorite = videoFile?.annotation?.is_favorite || false;
        const newFavoriteState = !isFavorite;
        try {
            await updateAnnotation(currentPath, { is_favorite: newFavoriteState });
            showToast({ message: newFavoriteState ? '已加入精品' : '已移出精品', type: 'success' });
        } catch (error) {
            showToast({ message: '操作失败', type: 'error' });
        }
    }, [currentPath, videoFile, updateAnnotation, showToast]);


     const cutSegment = useCallback(() => {
        // 1. 如果轨道没开，打开它
        if (!showClipTrack) {
            toggleClipTrack();
        }
        // 2. 执行分割
        const clip = clips.find(c => currentTime >= c.startTime && currentTime <= c.endTime);
        if (clip) {
            splitClip(clip.id, currentTime);
        }
    }, [showClipTrack, toggleClipTrack, clips, currentTime, splitClip]);

    const mergeSegment = useCallback(() => {
        mergeClip(currentTime);
    }, [currentTime, mergeClip]);

   const handleTranscode = useCallback(() => {
    if (!currentPath) return;

    // 1. 通知后端添加任务（后端会自己去排队，这里不需要 await）
    window.api.addTranscodeTask(currentPath);

    // 2. UI 反馈
    showToast({ message: '已加入转码队列，正在自动切换下一片...', type: 'info' });

    // 3. 立即切片（核心需求）
    playNext();
    
}, [currentPath, playNext, showToast]);

const handleLikeToggle = useCallback(async (isCtrl: boolean) => {
    if (!currentPath || !videoFile) return;

    const currentScore = videoFile.annotation?.like_count ?? 0;
    let newScore = currentScore;

    if (!isCtrl) {
        // 点赞：直接 +1
        newScore = currentScore + 1;
    } else {
        // 不喜欢：
        // 如果在 [1, 2) 之间，直接归零
        if (currentScore >= 1 && currentScore < 2) {
            newScore = 0;
        } else {
            newScore = currentScore - 1;
        }
    }

    // 1. 更新数据
    await updateAnnotation(currentPath, { like_count: newScore });
    // 2. 标记本次会话已交互，阻止衰减
    usePlayerStore.getState().setInteracted(true);
    
}, [currentPath, videoFile, updateAnnotation]);


const { skipFrameMode, setSkipFrameMode } = usePlayerStore();
const toggleSkipFrameMode = () => {
        setSkipFrameMode(!skipFrameMode);
    };

    return {
        playNext,      
        stepFrame,    
        toggleSidebar, 
        rotateVideo,
        softDelete,
        toggleFavorite,
        takeScreenshot,
        togglePlayPause: () => setPlaying(!isPlaying),
        openAssignTag,   
        openCreateTag,
        cutSegment,
        mergeSegment,
        toggleClipTrack,    
        handleTranscode,
        toggleSkipFrameMode, 
        handleLikeToggle
    };
}