import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { KnowledgeIngestionPipeline } from "~~/server/ingestion/pipeline/KnowledgeIngestionPipeline";
import { GitHubSource } from "~~/server/ingestion/sources/GitHubSource";
import { PDFSource } from "~~/server/ingestion/sources/PDFSource";
import { WordSource } from "~~/server/ingestion/sources/WordSource";
import { getDocumentById, updateDocument } from "~~/server/repositories/documentRepository";
import { getVectorStoreService } from "~~/server/services/vectorStore";
import { UPLOAD_CONFIG } from "~~/server/config";
import type { IngestionUploadType } from "~~/shared/ingestion";

function getUploadsDir() {
  return path.resolve("data", "uploads");
}

/**
 * 保存上传的文件到本地存储
 * 
 * 安全措施：
 * 1. 文件名清理：移除非法字符，防止路径遍历攻击
 * 2. 扩展名白名单验证：只允许 .pdf, .doc, .docx
 * 3. 文件名长度限制：防止文件系统错误
 * 
 * @param input.ingestionJobId - 任务 ID，用于文件名前缀
 * @param input.filename - 原始文件名
 * @param input.data - 文件数据
 * @returns 保存后的文件路径
 * @throws Error 如果文件扩展名不在白名单中
 */
export async function saveUploadFile(input: {
  ingestionJobId: string;
  filename: string;
  data: Buffer;
}): Promise<string> {
  // 文件统一落到 data/uploads，便于后续排障与清理
  const dir = getUploadsDir();
  await fs.mkdir(dir, { recursive: true });

  // 安全处理文件名
  const safeName = input.filename
    .replace(/[^a-zA-Z0-9_.-]/g, "_")  // 只保留安全字符（字母、数字、下划线、点、横线）
    .replace(/\.{2,}/g, "_")            // 防止路径遍历攻击（.. -> _）
    .replace(/^\.+/, "")                // 移除开头的点（防止隐藏文件）
    .slice(0, UPLOAD_CONFIG.maxFilenameLength); // 限制长度，防止文件系统错误

  // 验证文件扩展名白名单
  const ext = path.extname(safeName).toLowerCase();
  if (!UPLOAD_CONFIG.allowedExtensions.includes(ext as ".pdf" | ".doc" | ".docx")) {
    throw new Error(`不支持的文件类型: ${ext}，仅支持 ${UPLOAD_CONFIG.allowedExtensions.join(", ")}`);
  }

  const filePath = path.join(dir, `${input.ingestionJobId}_${safeName}`);
  await fs.writeFile(filePath, input.data);
  return filePath;
}

function hashBuffer(data: Buffer) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export async function runUploadIngestion(params: {
  type: IngestionUploadType;
  documentId: string;
  repoUrl?: string;
  branch?: string | null;
  filePath?: string;
  fileBuffer?: Buffer;
  onStage?: (stage: "parsing" | "chunking" | "embedding" | "indexing", progress: number) => void;
}) {
  const document = getDocumentById(params.documentId);
  if (!document) throw new Error("document not found");

  const pipeline = new KnowledgeIngestionPipeline();
  const vectorStore = await getVectorStoreService();
  // 覆盖重建策略：同 documentId 先删旧向量再重建
  await vectorStore.deleteByDocumentId(params.documentId);

  if (params.type === "github") {
    const source = new GitHubSource(params.repoUrl || "", params.documentId, params.branch || null);
    const result = await pipeline.ingest(source, params.onStage);
    updateDocument(params.documentId, {
      branch: result.documents[0]?.metadata.branch || null,
      commitHash: source.commitHash,
      chunkCount: result.chunks.length,
    });
    return;
  }

  if (!params.filePath || !params.fileBuffer) {
    throw new Error("Missing uploaded file data");
  }

  const contentHash = hashBuffer(params.fileBuffer);
  const source =
    params.type === "pdf"
      ? new PDFSource(params.filePath, params.documentId, document.sourcePath)
      : new WordSource(params.filePath, params.documentId, document.sourcePath);

  const result = await pipeline.ingest(source, params.onStage);
  updateDocument(params.documentId, {
    contentHash,
    chunkCount: result.chunks.length,
  });
}
