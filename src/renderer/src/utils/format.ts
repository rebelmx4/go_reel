import { formatDistanceToNowStrict, addSeconds, format } from 'date-fns';
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
  const seconds = unit === 's' ? time : time / 1000;
  const helperDate = addSeconds(new Date(0), seconds);
  // 如果超过 1 小时，显示 HH:mm:ss，否则显示 mm:ss
  return format(helperDate, seconds >= 3600 ? 'HH:mm:ss' : 'mm:ss');
};


/**
 * 格式化播放步进标签
 * @param value 秒数或 'frame'
 * @returns 格式化后的字符串: F, 5s, 1m, 10m 等
 */
export const formatPlaybackStep = (value: number | 'frame'): string => {
  if (value === 'frame') return 'F';
  if (value < 60) return `${value}s`;
  return `${Math.floor(value / 60)}m`;
};