// src/renderer/src/hooks/useVideoCrop.ts
import { useState, useCallback, useRef, RefObject } from 'react';

export function useVideoCrop(
  videoRef: RefObject<HTMLVideoElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  rotation: number,
  onCropComplete: (base64: string) => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const [cropRect, setCropRect] = useState<{ startX: number; startY: number; currX: number; currY: number } | null>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    startPos.current = { x: e.clientX, y: e.clientY };
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropRect({ startX: x, startY: y, currX: x, currY: y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cropRect) return;
    const dist = Math.sqrt(Math.pow(e.clientX - startPos.current.x, 2) + Math.pow(e.clientY - startPos.current.y, 2));
    
    // 只有移动超过 10px 才显示框选框
    if (dist > 10) {
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setCropRect({ ...cropRect, currX: e.clientX - rect.left, currY: e.clientY - rect.top });
      }
    }
  };

  const handleMouseUp = useCallback(() => {
    let wasCropping = false;

    if (isDragging && cropRect && videoRef.current && containerRef.current) {
      wasCropping = true; // 标记这是一次有效的框选
      const video = videoRef.current;
      const container = containerRef.current;
      
      const x = Math.min(cropRect.startX, cropRect.currX);
      const y = Math.min(cropRect.startY, cropRect.currY);
      const w = Math.abs(cropRect.currX - cropRect.startX);
      const h = Math.abs(cropRect.currY - cropRect.startY);

      const vRect = video.getBoundingClientRect();
      const cRect = container.getBoundingClientRect();

      const relX = (x + cRect.left - vRect.left) / vRect.width;
      const relY = (y + cRect.top - vRect.top) / vRect.height;
      const relW = w / vRect.width;
      const relH = h / vRect.height;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const is90 = rotation === 90 || rotation === 270;
      const drawW = is90 ? video.videoHeight : video.videoWidth;
      const drawH = is90 ? video.videoWidth : video.videoHeight;

      canvas.width = relW * drawW;
      canvas.height = relH * drawH;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = drawW;
      tempCanvas.height = drawH;
      const tCtx = tempCanvas.getContext('2d')!;
      tCtx.translate(drawW / 2, drawH / 2);
      tCtx.rotate((rotation * Math.PI) / 180);
      tCtx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);

      ctx.drawImage(tempCanvas, relX * drawW, relY * drawH, relW * drawW, relH * drawH, 0, 0, canvas.width, canvas.height);
      onCropComplete(canvas.toDataURL('image/webp', 0.9));
    }

    setIsDragging(false);
    setCropRect(null);
    return wasCropping; // 返回 true 表示刚才在框选，返回 false 表示只是点击
  }, [isDragging, cropRect, rotation, onCropComplete, videoRef, containerRef]);

  return { handleMouseDown, handleMouseMove, handleMouseUp, cropRect, isDragging };
}