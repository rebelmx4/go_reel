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

// 3. 视频播放时间格式化 (00:00:00) 
// 这种格式建议手动写，因为库返回的多是 "1h 2m" 格式
export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [m.toString().padStart(2, '0'), s.toString().padStart(2, '0')];
  if (h > 0) parts.unshift(h.toString());
  return parts.join(':');
};