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


     const handleTranscode = useCallback(async () => {
        if (!currentPath) return;

        showToast({ message: '转码已开始，请稍候...', type: 'info' });

        try {
            const result = await window.api.transcodeVideo(currentPath);
            if (result.success) {
                // 按照你的设计：转码成功后仅提示，用户重新点击该视频即可播放正确的
                showToast({ 
                    message: '转码成功！重新点击播放或切换视频即可生效', 
                    type: 'success',
                    // duration: 5000 // 可以适当延长提示时间
                });
            } else {
                showToast({ message: `转码失败: ${result.error}`, type: 'error' });
            }
        } catch (error: any) {
            showToast({ message: `请求转码失败: ${error.message}`, type: 'error' });
        }
    }, [currentPath, showToast]);

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
        handleTranscode    
    };
}