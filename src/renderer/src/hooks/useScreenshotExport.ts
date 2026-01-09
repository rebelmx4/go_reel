import { useState, useEffect, useCallback } from 'react';
import { useToastStore, useVideoFileRegistryStore  } from '../stores';
import { keyBindingManager } from '../utils/KeyBindingManager'; // 引入管理器
import { AppAction } from '../../../shared/settings.schema';


export function useScreenshotExport(
    currentVideoPath: string | null
) {
    const [showExportDialog, setShowExportDialog] = useState(false);
    const showToast = useToastStore((state) => state.showToast);
    const videoFile = useVideoFileRegistryStore((s) => currentVideoPath ? s.videos[currentVideoPath] : null);

    // 核心导出逻辑：判断是直接导出还是打开弹窗
    const handleSmartExport = useCallback(async (forceDialog: boolean = false) => {
        if (!currentVideoPath || !videoFile) return;

        try {
            const savedRotation = videoFile.annotation?.screenshot_rotation ?? null;

            // 如果强制配置，或者从未配置过 -> 打开弹窗
            if (forceDialog || savedRotation === null) {
                setShowExportDialog(true);
            } else {
                // 直接导出模式 (Smart Export)
                showToast({ message: '正在快速导出...', type: 'info' });
                await window.api.exportScreenshots(currentVideoPath, savedRotation);
                showToast({ message: '导出成功', type: 'success' });
            }
        } catch (error) {
            console.error('Export error:', error);
            showToast({ message: '操作失败', type: 'error' });
        }
     }, [currentVideoPath, videoFile, showToast]);

    // 重构后的键盘监听逻辑：注册到管理器
    useEffect(() => {
        // 定义动作处理器
        const handlers = {
            // 对应 Ctrl + E 的动作名 (需在 settings.json 中配置映射)
            export_screenshot: () => handleSmartExport(false),
            // 对应 Alt + E 的动作名
            export_screenshot_with_dialog: () => handleSmartExport(true)
        };


        // 注册
        keyBindingManager.registerHandlers(handlers);

        // 清理时注销
        return () => {
            keyBindingManager.unregisterHandlers(Object.keys(handlers) as AppAction[]);
        };
    }, [handleSmartExport]);

    return {
        showExportDialog,
        setShowExportDialog
    };
}