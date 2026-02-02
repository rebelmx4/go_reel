import { useState } from 'react';
import { useToastStore } from '../stores';

export function useStoryboard(videoPath: string | null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToastStore();

  const generate = async () => {
    if (!videoPath) return;
    setLoading(true);
    try {
      const url = await window.api.generateStoryboardPreview(videoPath);
      setPreviewUrl(url);
    } catch (e: any) {
      showToast({ message: e.message || '生成失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!videoPath || !previewUrl) return;
    try {
      await window.api.saveStoryboard(videoPath, previewUrl);
      showToast({ message: '故事板已保存至本地目录', type: 'success' });
      setPreviewUrl(null); // 关闭预览
    } catch (e) {
      showToast({ message: '保存失败', type: 'error' });
    }
  };

  return { previewUrl, setPreviewUrl, loading, generate, save };
}