import { useState, useCallback, useRef, RefObject } from 'react';

export function useVideoCrop(
  videoRef: RefObject<HTMLVideoElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  rotation: number,
  isPlaying: boolean,
  setPlaying: (play: boolean) => void,
  onCropComplete: (base64: string) => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const [cropRect, setCropRect] = useState<{ startX: number; startY: number; currX: number; currY: number } | null>(null);
  
  // 用于判断是“点击”还是“拖拽”
  const startPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // 只响应左键
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    startPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setCropRect({ startX: x, startY: y, currX: x, currY: y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !cropRect) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setCropRect(prev => prev ? ({
      ...prev,
      currX: e.clientX - rect.left,
      currY: e.clientY - rect.top,
    }) : null);
  };

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !cropRect || !videoRef.current || !containerRef.current) {
      setIsDragging(false);
      setCropRect(null);
      return;
    }

    // 1. 判断是点击还是拖拽
    const dist = Math.sqrt(Math.pow(e.clientX - startPos.current.x, 2) + Math.pow(e.clientY - startPos.current.y, 2));
    
    if (dist < 5) {
      // 距离太小，视为“点击”，触发播放/暂停切换
      setPlaying(!isPlaying);
      setIsDragging(false);
      setCropRect(null);
      return;
    }

    // 2. 执行截图逻辑 (所见即所得 + 原始分辨率)
    const video = videoRef.current;
    const container = containerRef.current;
    
    // 计算 UI 上的选框坐标
    const x = Math.min(cropRect.startX, cropRect.currX);
    const y = Math.min(cropRect.startY, cropRect.currY);
    const w = Math.abs(cropRect.currX - cropRect.startX);
    const h = Math.abs(cropRect.currY - cropRect.startY);

    // 获取视频渲染的实际位置（处理 contain 导致的黑边）
    const vRect = video.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();

    // 选框相对于“视频显示区域”的比例坐标 (0.0 ~ 1.0)
    const relX = (x + cRect.left - vRect.left) / vRect.width;
    const relY = (y + cRect.top - vRect.top) / vRect.height;
    const relW = w / vRect.width;
    const relH = h / vRect.height;

    // 绘制到 Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // 原始分辨率下的显示宽度 (考虑旋转)
    const is90 = rotation === 90 || rotation === 270;
    const drawW = is90 ? video.videoHeight : video.videoWidth;
    const drawH = is90 ? video.videoWidth : video.videoHeight;

    // 设置画布大小为选框对应的原始分辨率大小
    canvas.width = relW * drawW;
    canvas.height = relH * drawH;

    // 关键：先旋转完整画面，再根据比例切下
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = drawW;
    tempCanvas.height = drawH;
    const tCtx = tempCanvas.getContext('2d')!;
    tCtx.translate(drawW / 2, drawH / 2);
    tCtx.rotate((rotation * Math.PI) / 180);
    tCtx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);

    // 从旋转好的大图中切下选区
    ctx.drawImage(
      tempCanvas,
      relX * drawW, relY * drawH, relW * drawW, relH * drawH,
      0, 0, canvas.width, canvas.height
    );

    onCropComplete(canvas.toDataURL('image/webp', 0.9));

    setIsDragging(false);
    setCropRect(null);
  }, [isDragging, cropRect, rotation, isPlaying, setPlaying, onCropComplete]);

  return { handleMouseDown, handleMouseMove, handleMouseUp, cropRect, isDragging };
}