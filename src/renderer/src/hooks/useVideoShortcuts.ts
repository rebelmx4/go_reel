// src/components/VideoPlayer/hooks/useVideoShortcuts.ts
import { useEffect, useRef } from 'react';
import { keyBindingManager } from '../utils/KeyBindingManager';
import { AppAction } from '../../../shared/settings.schema';


interface ShortcutHandlers {
    togglePlayPause: () => void;
    rotateVideo: () => void;
    stepFrame: (dir: number) => void;
    takeScreenshot: () => void;
    toggleTagDialog: () => void;
    playNextVideo: () => void;
    softDelete: () => void; 
    toggleFavorite: () => void; 
}

export function useVideoShortcuts(handlers: ShortcutHandlers) {
    const handlersRef = useRef(handlers);

    // 每次渲染只更新 Ref，不触发任何 Effect
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);


    useEffect(() => {
        // 定义 动作名称 (settings.json 中的 key) -> 执行函数 的映射
        const actionMap: Record<string, () => void> = {
            // --- 播放控制 (play_control) ---
            toggle_play: () => handlersRef.current.togglePlayPause(),
            step_backward: () => handlersRef.current.stepFrame(-1),
            step_forward: () => handlersRef.current.stepFrame(1),
            rotate_video: () => handlersRef.current.rotateVideo(),
            
            // --- 截图 (capture) ---
            screenshot: () => handlersRef.current.takeScreenshot(),

            // --- 标签 (edit_tag) ---
            open_assign_tag_dialog: () => handlersRef.current.toggleTagDialog(),

            // --- 列表导航 (需要你在 JSON 中添加对应配置) ---
            // 原代码使用的是 PageDown，建议在 settings.json 中添加 "play_next": "PageDown"
            play_next: () => handlersRef.current.playNextVideo(), 
            soft_delete: () => handlersRef.current.softDelete(),
            toggle_favorite: () => handlersRef.current.toggleFavorite(), 
        };

        const actionKeys = Object.keys(actionMap);
        console.log("注册 rotate_video")

        // 批量注册
        keyBindingManager.registerHandlers(actionMap);

        // 组件卸载时批量注销
        return () => {
            console.log(`[useVideoShortcuts] 注销动作: ${actionKeys.join(', ')}`);
            keyBindingManager.unregisterHandlers(Object.keys(actionMap) as AppAction[]);
        };
    }, []);
}