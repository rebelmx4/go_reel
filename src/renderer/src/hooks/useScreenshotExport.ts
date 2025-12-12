import { useState, useEffect, useCallback } from 'react';
import { useToastStore } from '../stores';

export function useScreenshotExport(
    currentVideoPath: string | null, 
    isCropMode: boolean,
    setCropMode: (val: boolean) => void,
) {
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [exportRotationAnnotation, setExportRotationAnnotation] = useState<number | null>(null);
    const [currentHash, setCurrentHash] = useState<string | null>(null);
    const showToast = useToastStore((state) => state.showToast);

    // 核心导出逻辑：判断是直接导出还是打开弹窗
    const handleSmartExport = useCallback(async (forceDialog: boolean = false) => {
        if (!currentVideoPath) return;

        try {
            const hash = await window.api.calculateVideoHash(currentVideoPath);
            if (!hash) return;
            setCurrentHash(hash);

            // 获取已保存的旋转角度
            const annotation = await window.api.getAnnotation(hash);
            // 从注解对象中获取旋转角度，如果不存在则为 null
            const savedRotation = annotation?.screenshot_rotation ?? null;
            setExportRotationAnnotation(savedRotation);

            // 如果强制配置，或者从未配置过 -> 打开弹窗
            if (forceDialog || savedRotation === null) {
                setShowExportDialog(true);
            } else {
                // 直接导出模式 (Smart Export)
                showToast({ message: '正在快速导出...', type: 'info' });
                await window.api.exportScreenshots(hash, savedRotation);
                showToast({ message: '导出成功', type: 'success' });
            }
        } catch (error) {
            console.error('Export error:', error);
            showToast({ message: '操作失败', type: 'error' });
        }
    }, [currentVideoPath, showToast]);

    // 键盘监听逻辑
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key.toLowerCase() === 'e') {
                e.preventDefault();

                if (e.ctrlKey) {
                    // Ctrl + E: 智能导出
                    handleSmartExport(false);
                } else if (e.altKey) {
                    // Alt + E: 强制配置导出
                    handleSmartExport(true);
                } 
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSmartExport, isCropMode, setCropMode]);

    return {
        showExportDialog,
        setShowExportDialog,
        exportRotationMetadata: exportRotationAnnotation,
        currentHash
    };
}