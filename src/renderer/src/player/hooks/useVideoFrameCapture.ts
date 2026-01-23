import { useCallback } from 'react';
import { useVideoContext } from '../contexts';


export function useVideoFrameCapture() {
    const { videoRef } = useVideoContext();

    const captureFrame = useCallback((rotation: number): string => {
        const video = videoRef.current
        if (!video || video.readyState < 2) return '';

        const is90 = rotation === 90 || rotation === 270;
        const drawW = is90 ? video.videoHeight : video.videoWidth;
        const drawH = is90 ? video.videoWidth : video.videoHeight;

        // 2. 创建画布
        const canvas = document.createElement('canvas');
        canvas.width = drawW;
        canvas.height = drawH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        // 3. 变换与绘图（1:1 复制你成功代码的坐标变换）
        ctx.translate(drawW / 2, drawH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        
        // 关键：使用 3 参数模式，避免宽高缩放干扰
        ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);

        // 4. 使用 webp 1.0 导出（和你 screenshot.ts 保持一致）
        const dataUrl = canvas.toDataURL('image/webp', 1.0);
        console.log("[Capture] 抓取完成，Base64 长度:", dataUrl.length);
        return dataUrl;
    }, []);

    return { captureFrame };
}