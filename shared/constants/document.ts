/**
 * 文档相关常量定义
 */

import type { DocumentStatus, DocumentSourceType, DocumentStage } from "../document";

/**
 * 文档状态中文标签映射
 */
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploading: "上传中",
  processing: "处理中",
  active: "使用中",
  failed: "失败",
  inactive: "停用",
  deleting: "删除中",
};

/**
 * 文档来源类型中文标签映射
 */
export const DOCUMENT_SOURCE_TYPE_LABELS: Record<DocumentSourceType, string> = {
  github: "GitHub",
  pdf: "PDF",
  word: "Word",
};

/**
 * 文档处理阶段中文标签映射
 */
export const DOCUMENT_STAGE_LABELS: Record<DocumentStage, string> = {
  queued: "排队中",
  parsing: "解析中",
  chunking: "分块中",
  embedding: "嵌入中",
  indexing: "索引中",
  completed: "已完成",
  failed: "已失败",
};
