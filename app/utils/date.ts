/**
 * 时间格式化工具函数
 */

/**
 * 格式化时间戳为 YYYY-MM-DD HH:mm 格式
 * @param timestamp - 时间戳（毫秒）
 * @returns 格式化后的时间字符串
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number): string => n.toString().padStart(2, "0");
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 格式化时间戳为本地化字符串
 * @param timestamp - 时间戳（毫秒）
 * @returns 本地化的时间字符串
 */
export function formatDateTimeLocale(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}
