/**
 * 文档数据访问层（Repository）
 * 负责文档相关的数据库操作
 */

import { nanoid } from "nanoid";
import type {
  CreateDocumentInput,
  DocumentRecord,
  DocumentStatus,
  UpdateDocumentInput,
} from "~~/shared/document";
import type { DbDocumentRow, DbCountRow } from "~~/server/types/database";
import { getDb, nowMs } from "~~/server/core/database";

/**
 * 将数据库行映射为文档记录对象
 * @param row 数据库查询结果行
 * @returns 文档记录对象
 */
function mapDocumentRow(row: DbDocumentRow): DocumentRecord {
  return {
    documentId: row.document_id,
    title: row.title,
    sourceType: row.source_type as DocumentRecord["sourceType"],
    sourcePath: row.source_path,
    repo: row.repo,
    branch: row.branch,
    contentHash: row.content_hash,
    commitHash: row.commit_hash,
    version: row.version,
    status: row.status as DocumentStatus,
    currentStage: row.current_stage as DocumentRecord["currentStage"],
    chunkCount: row.chunk_count,
    errorMessage: row.error_message,
    ingestionJobId: row.ingestion_job_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastIngestedAt: row.last_ingested_at,
    deletedAt: row.deleted_at,
  };
}

/**
 * 创建新文档记录
 * @param input 文档创建参数
 * @returns 创建的文档记录
 */
export function createDocument(input: CreateDocumentInput): DocumentRecord {
  const db = getDb();
  const ts = nowMs();
  const documentId = nanoid();
  db.prepare(
    `INSERT INTO documents(
      document_id, title, source_type, source_path, repo, branch, content_hash, commit_hash,
      version, status, current_stage, chunk_count, error_message, ingestion_job_id, created_at, updated_at,
      last_ingested_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, NULL, NULL)`
  ).run(
    documentId,
    input.title,
    input.sourceType,
    input.sourcePath ?? null,
    input.repo ?? null,
    input.branch ?? null,
    input.contentHash ?? null,
    input.commitHash ?? null,
    input.version ?? null,
    input.status,
    null,
    input.ingestionJobId ?? null,
    ts,
    ts
  );
  return getDocumentById(documentId)!;
}

/**
 * 根据 ID 获取文档记录
 * @param documentId 文档 ID
 * @returns 文档记录，不存在则返回 null
 */
export function getDocumentById(documentId: string): DocumentRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        document_id,
        title,
        source_type,
        source_path,
        repo,
        branch,
        content_hash,
        commit_hash,
        version,
        status,
        current_stage,
        chunk_count,
        error_message,
        ingestion_job_id,
        created_at,
        updated_at,
        last_ingested_at,
        deleted_at
      FROM documents WHERE document_id=?`
    )
    .get(documentId) as DbDocumentRow | undefined;
  return row ? mapDocumentRow(row) : null;
}

/**
 * 根据来源信息查找文档
 * 用于判断文档是否已存在（覆盖更新场景）
 * @param params.sourceType 来源类型（github/pdf/word）
 * @param params.sourcePath 来源路径
 * @param params.branch 分支名（仅 GitHub）
 * @returns 文档记录，不存在则返回 null
 */
export function getDocumentBySource(params: {
  sourceType: string;
  sourcePath: string | null;
  branch: string | null;
}): DocumentRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        document_id,
        title,
        source_type,
        source_path,
        repo,
        branch,
        content_hash,
        commit_hash,
        version,
        status,
        current_stage,
        chunk_count,
        error_message,
        ingestion_job_id,
        created_at,
        updated_at,
        last_ingested_at,
        deleted_at
      FROM documents
      WHERE source_type = ?
        AND ((source_path IS NULL AND ? IS NULL) OR source_path = ?)
        AND ((branch IS NULL AND ? IS NULL) OR branch = ?)
      LIMIT 1`
    )
    .get(
      params.sourceType,
      params.sourcePath,
      params.sourcePath,
      params.branch,
      params.branch
    ) as DbDocumentRow | undefined;
  return row ? mapDocumentRow(row) : null;
}

/**
 * 更新文档记录
 * 支持部分字段更新，自动更新 updated_at
 * @param documentId 文档 ID
 * @param updates 更新字段
 */
export function updateDocument(
  documentId: string,
  updates: UpdateDocumentInput,
): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  const mapping: Record<string, string> = {
    title: "title",
    sourceType: "source_type",
    sourcePath: "source_path",
    repo: "repo",
    branch: "branch",
    contentHash: "content_hash",
    commitHash: "commit_hash",
    version: "version",
    status: "status",
    currentStage: "current_stage",
    chunkCount: "chunk_count",
    errorMessage: "error_message",
    ingestionJobId: "ingestion_job_id",
    updatedAt: "updated_at",
    lastIngestedAt: "last_ingested_at",
    deletedAt: "deleted_at",
  };

  for (const [key, column] of Object.entries(mapping)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      fields.push(`${column}=?`);
      values.push((updates as any)[key]);
    }
  }

  if (fields.length === 0) return;
  if (!Object.prototype.hasOwnProperty.call(updates, "updatedAt")) {
    fields.push("updated_at=?");
    values.push(nowMs());
  }

  values.push(documentId);
  db.prepare(`UPDATE documents SET ${fields.join(", ")} WHERE document_id=?`).run(
    ...values
  );
}

/**
 * 设置文档状态
 * 快捷方法，用于状态转换场景
 * @param documentId 文档 ID
 * @param status 新状态
 * @param errorMessage 错误信息（可选）
 */
export function setDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  errorMessage?: string,
): void {
  updateDocument(documentId, {
    status,
    errorMessage: errorMessage ?? null,
  });
}

/**
 * 物理删除文档记录
 * 注意：这是物理删除，数据无法恢复
 * @param documentId 文档 ID
 */
export function deleteDocumentById(documentId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM documents WHERE document_id=?").run(documentId);
}

/**
 * 分页查询文档列表
 * 业务约定：列表默认隐藏 deleting 状态的文档
 * @param params.page 页码（从 1 开始）
 * @param params.pageSize 每页数量
 * @param params.status 状态筛选（可选，"all" 表示所有状态）
 * @returns 文档列表和总数
 */
export function listDocuments(params: {
  page: number;
  pageSize: number;
  status?: DocumentStatus | "all";
}): { items: DocumentRecord[]; total: number } {
  const db = getDb();
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, params.pageSize || 3);
  const offset = (page - 1) * pageSize;

  // 业务约定：列表默认隐藏 deleting。
  const whereParts = ["status != 'deleting'"];
  const values: unknown[] = [];
  if (params.status && params.status !== "all") {
    whereParts.push("status = ?");
    values.push(params.status);
  }
  const whereSql = `WHERE ${whereParts.join(" AND ")}`;

  const rows = db
    .prepare(
      `SELECT
        document_id,
        title,
        source_type,
        source_path,
        repo,
        branch,
        content_hash,
        commit_hash,
        version,
        status,
        current_stage,
        chunk_count,
        error_message,
        ingestion_job_id,
        created_at,
        updated_at,
        last_ingested_at,
        deleted_at
      FROM documents
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
    )
    .all(...values, pageSize, offset) as DbDocumentRow[];

  const countRow = db
    .prepare(`SELECT COUNT(1) as total FROM documents ${whereSql}`)
    .get(...values) as DbCountRow;

  return {
    items: rows.map((row) => mapDocumentRow(row)),
    total: countRow.total,
  };
}
