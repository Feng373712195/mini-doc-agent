/**
 * 类型守卫函数
 * 
 * 用于运行时类型校验，确保输入数据符合预期类型
 * 相比 as 断言，类型守卫提供真正的运行时安全保护
 */

import type { DocumentSourceType, DocumentStatus } from "~~/shared/document";
import type { IngestionJobStage } from "~~/shared/ingestion";

/**
 * 检查值是否为有效的文档来源类型
 */
export function isDocumentSourceType(value: unknown): value is DocumentSourceType {
  return typeof value === "string" && ["github", "pdf", "word"].includes(value);
}

/**
 * 检查值是否为有效的文档状态
 */
export function isDocumentStatus(value: unknown): value is DocumentStatus {
  return (
    typeof value === "string" &&
    ["uploading", "processing", "active", "failed", "inactive", "deleting"].includes(value)
  );
}

/**
 * 检查值是否为有效的摄取任务阶段
 */
export function isIngestionJobStage(value: unknown): value is IngestionJobStage {
  return (
    typeof value === "string" &&
    ["queued", "parsing", "chunking", "embedding", "indexing", "completed", "failed"].includes(
      value
    )
  );
}
