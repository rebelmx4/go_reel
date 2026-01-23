import { useCallback } from 'react';
import { usePlayerStore, useScreenshotStore, usePlaylistStore, useToastStore, useVideoFileRegistryStore } from '../../stores';
import {useVideoFrameCapture} from "./useVideoFrameCapture"
import { useVideoContext } from '../contexts';


interface PlayerActionOptions {
    onOpenAssignTag: () => void;
    onOpenCreateTag: (cover?: string) => void;
}

export function usePlayerActions( options?: PlayerActionOptions ) {
    const { videoRef } = useVideoContext();

    
    const currentPath = usePlaylistStore(state => state.currentPath);
    const playNext = usePlaylistStore(state => state.next);
    const { rotation, setRotation, setPlaying, isPlaying} = usePlayerStore();
    const { captureManual } = useScreenshotStore();
    const { showToast } = useToastStore();
    const updateAnnotation = useVideoFileRegistryStore(s => s.updateAnnotation);
    const videoFile = useVideoFileRegistryStore(s => currentPath ? s.videos[currentPath] : null);
    const { captureFrame } = useVideoFrameCapture();

     const openAssignTag = useCallback(() => {
        setPlaying(false); 
        options?.onOpenAssignTag();
    }, [setPlaying, options]);

    const openCreateTag = useCallback(() => {
        if (!videoRef.current) return;
        setPlaying(false);
        
        // 关键步骤：在这里抓取当前带有旋转角度的图片
        const frameBase64 = captureFrame(rotation);
        
        options?.onOpenCreateTag(frameBase64); 
    }, [setPlaying, options, rotation, videoRef, captureFrame]);

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


    return {
        rotateVideo,
        softDelete,
        toggleFavorite,
        takeScreenshot,
        togglePlayPause: () => setPlaying(!isPlaying),
        openAssignTag,   
        openCreateTag    
    };
}