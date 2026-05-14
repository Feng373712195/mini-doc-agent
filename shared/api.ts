/**
 * 统一的 API 响应类型定义
 */

import type { DocumentRecord, DocumentSourceType } from "./document";

/**
 * 通用 API 响应结构
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/**
 * 文档列表响应数据
 */
export interface DocumentListData {
  items: DocumentRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

/**
 * 文档列表 API 响应
 */
export type DocumentListResponse = ApiResponse<DocumentListData>;

/**
 * 文档状态切换响应数据
 */
export interface DocumentStatusToggleData {
  documentId: string;
  status: string;
}

/**
 * 文档状态切换 API 响应
 */
export type DocumentStatusToggleResponse = ApiResponse<DocumentStatusToggleData>;

/**
 * 文档刷新响应数据
 */
export interface DocumentRefreshData {
  mode: "background_refresh" | "need_reupload";
  documentId?: string;
  sourceType?: DocumentSourceType;
  title?: string;
}

/**
 * 文档刷新 API 响应
 */
export type DocumentRefreshResponse = ApiResponse<DocumentRefreshData>;
