/**
 * API 响应构造工具
 * 提供统一的响应格式构造函数
 */

import type { ApiResponse } from "~~/shared/api";

/**
 * 创建成功响应
 * @param data 响应数据
 * @param message 响应消息，默认 "ok"
 * @returns 标准 API 响应对象
 */
export function createSuccessResponse<T>(
  data: T,
  message: string = "ok",
): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
    timestamp: Date.now(),
  };
}

/**
 * 创建错误响应
 * @param message 错误消息
 * @param code 错误码，默认 1
 * @returns 标准 API 错误响应对象
 */
export function createErrorResponse(
  message: string,
  code: number = 1,
): ApiResponse<null> {
  return {
    code,
    message,
    data: null,
    timestamp: Date.now(),
  };
}
