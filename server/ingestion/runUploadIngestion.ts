import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { KnowledgeIngestionPipeline } from "~~/server/ingestion/pipeline/KnowledgeIngestionPipeline";
import { GitHubSource } from "~~/server/ingestion/sources/GitHubSource";
import { PDFSource } from "~~/server/ingestion/sources/PDFSource";
import { WordSource } from "~~/server/ingestion/sources/WordSource";
import { getDocumentById, updateDocument } from "~~/server/repositories/documentRepository";
import { getVectorStoreService } from "~~/server/services/vectorStore";
import type { IngestionUploadType } from "~~/shared/ingestion";

function getUploadsDir() {
  return path.resolve("data", "uploads");
}

export async function saveUploadFile(input: {
  ingestionJobId: string;
  filename: string;
  data: Buffer;
}) {
  // 文件统一落到 data/uploads，便于后续排障与清理
  const dir = getUploadsDir();
  await fs.mkdir(dir, { recursive: true });
  const safeName = input.filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
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
