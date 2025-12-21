// src/components/VideoPlayer/hooks/useVideoShortcuts.ts
import { useEffect } from 'react';

interface ShortcutHandlers {
    togglePlayPause: () => void;
    rotateVideo: () => void;
    stepFrame: (dir: number) => void;
    takeScreenshot: () => void; // 智能判断是 crop 还是 raw
    toggleTagDialog: () => void;
    playNextVideo: () => void;
}

export function useVideoShortcuts(handlers: ShortcutHandlers) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 忽略输入框中的按键
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    handlers.togglePlayPause();
                    break;
                case 'r':
                    e.preventDefault();
                    handlers.rotateVideo();
                    break;
                case 'a':
                    e.preventDefault();
                    handlers.stepFrame(-1);
                    break;
                case 'd':
                    e.preventDefault();
                    handlers.stepFrame(1);
                    break;
                case 'e':
                    e.preventDefault();
                    handlers.takeScreenshot();
                    break;
                case 'g':
                    if (e.shiftKey) {
                        e.preventDefault();
                        handlers.toggleTagDialog();
                    }
                    break;
                case 'pagedown':
                    e.preventDefault();
                    handlers.playNextVideo();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlers]);
}