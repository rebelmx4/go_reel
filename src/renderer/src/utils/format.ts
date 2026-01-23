import { formatDistanceToNowStrict } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import prettyBytes from 'pretty-bytes';

// 1. 相对日期格式化 (今天、昨天、x天前)
export const formatRelativeTime = (date: number | Date) => {
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: zhCN });
};

// 2. 文件大小格式化 (1.2 GB)
export const formatFileSize = (bytes: number) => {
  return prettyBytes(bytes);
};

/**
 * 格式化视频时间 (支持秒或毫秒)
 * @param time 数值
 * @param unit 单位，默认为 's' (秒)，可选 'ms' (毫秒)
 * @returns 格式化后的字符串 00:00 或 00:00:00
 */
export const formatDuration = (time: number, unit: 's' | 'ms' = 's') => {
  const seconds = unit === 'ms' ? Math.floor(time / 1000) : Math.floor(time);
  
  if (isNaN(seconds) || seconds < 0) return '00:00';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');

  if (h > 0) {
    const hh = h.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
};