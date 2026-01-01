// src/components/VideoPlayer/hooks/useVideoShortcuts.ts
import { useEffect, useRef } from 'react';

interface ShortcutHandlers {
    togglePlayPause: () => void;
    rotateVideo: () => void;
    stepFrame: (dir: number) => void;
    takeScreenshot: () => void; // 智能判断是 crop 还是 raw
    toggleTagDialog: () => void;
    playNextVideo: () => void;
}

export function useVideoShortcuts(handlers: ShortcutHandlers) {
    const handlersRef = useRef(handlers);

    // 每次渲染只更新 Ref，不触发任何 Effect
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);


    useEffect(() => {
        console.log("绑定监听器 (Add Event Listener)");

        const handleKeyDown = (e: KeyboardEvent) => {
            // 忽略输入框中的按键
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // 2. 核心修改：如果按键是处于“长按重复触发”状态，直接返回
            if (e.repeat) {
                return;
            }

            const h = handlersRef.current; // 永远拿最新的函数集

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    h.togglePlayPause();
                    break;
                case 'r':
                    e.preventDefault();
                    h.rotateVideo();
                    break;
                case 'a':
                    e.preventDefault();
                    h.stepFrame(-1);
                    break;
                case 'd':
                    e.preventDefault();
                    h.stepFrame(1);
                    break;
                case 'g':
                    if (e.shiftKey) {
                        e.preventDefault();
                        h.toggleTagDialog();
                    }
                    break;
                case 'pagedown':
                    e.preventDefault();
                    h.playNextVideo();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
}