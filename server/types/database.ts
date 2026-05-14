/**
 * 数据库表行类型定义
 * 
 * 字段名使用 snake_case，与数据库列名保持一致
 * 用于类型化数据库查询结果，消除 any 类型
 */

/**
 * conversations 表行类型
 */
export interface DbConversationRow {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

/**
 * messages 表行类型
 */
export interface DbMessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: number;
  updated_at: number;
}

/**
 * documents 表行类型
 */
export interface DbDocumentRow {
  document_id: string;
  title: string;
  source_type: string;
  source_path: string | null;
  repo: string | null;
  branch: string | null;
  content_hash: string | null;
  commit_hash: string | null;
  version: string | null;
  status: string;
  current_stage: string | null;
  chunk_count: number;
  error_message: string | null;
  ingestion_job_id: string | null;
  created_at: number;
  updated_at: number;
  last_ingested_at: number | null;
  deleted_at: number | null;
}

/**
 * 文档列表查询的 COUNT 结果类型
 */
export interface DbCountRow {
  total: number;
}
