// src/renderer/src/hooks/useFileActions.ts

import { useVideoFileRegistryStore, useToastStore } from '../stores';
import { VideoFile } from '../../../shared/models';

export function useFileActions() {
    const removeVideo = useVideoFileRegistryStore((state) => state.removeVideo);
    const showToast = useToastStore((state) => state.showToast);

    /**
     * 在资源管理器中显示
     */
    const handleShowInExplorer = async (path: string) => {
        const res = await window.api.showInExplorer(path);
        if (res && !res.success) {
            showToast({ message: `无法打开路径: ${res.error}`, type: 'error' });
        }
    };

    /**
     * 删除视频（移至回收站）
     */
    const handleDelete = async (video: VideoFile) => {
        // 可以在这里统一加一个确认逻辑（可选）
        const success = await window.api.moveToTrash(video.path);
        
        if (success) {
            // 从全局 Store 中移除，所有订阅该 Store 的页面都会自动消失该卡片
            removeVideo(video.path);
            showToast({ message: '文件已移至回收站', type: 'success' });
        } else {
            showToast({ message: '删除失败', type: 'error' });
        }
    };

    return {
        handleShowInExplorer,
        handleDelete
    };
}