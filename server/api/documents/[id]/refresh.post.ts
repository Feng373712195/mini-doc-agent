import { createError, defineEventHandler, getRouterParam } from "h3";
import { getDocumentById } from "~~/server/repositories/documentRepository";
import { createSuccessResponse } from "~~/server/utils/response";
import { runIngestionJob } from "~~/server/services/ingestionJobs";
import { runUploadIngestion } from "~~/server/ingestion/runUploadIngestion";

/**
 * 刷新文档接口
 * 
 * GitHub 类型：后台重新拉取并重建索引
 * PDF/Word 类型：返回 need_reupload，前端引导用户重新上传
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing document id",
    });
  }

  const document = getDocumentById(id);
  if (!document) {
    throw createError({ statusCode: 404, statusMessage: "Document not found" });
  }

  if (!["active", "inactive", "failed"].includes(document.status)) {
    throw createError({
      statusCode: 409,
      statusMessage: "Document status does not allow refresh",
    });
  }

  const ingestionJobId = `refresh-${id}-${Date.now()}`;

  // GitHub 类型：后台重新拉取并重建索引
  if (document.sourceType === "github") {
    if (!document.sourcePath) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing repoUrl in sourcePath",
      });
    }

    console.log(`[refresh] Starting background refresh for GitHub document ${id}`);

    // 异步执行刷新任务，接口立即返回
    // runIngestionJob 内部已有完整的错误处理，会将错误写入 errorMessage
    runIngestionJob({
      ingestionJobId,
      documentId: id,
      task: async (emitStage) => {
        await runUploadIngestion({
          type: "github",
          documentId: id,
          repoUrl: document.sourcePath as string,
          branch: document.branch,
          onStage: (stage, progress) => emitStage(stage, progress, stage),
        });
      },
    }).catch((error) => {
      // 捕获未预期的错误，记录日志
      // runIngestionJob 的 catch 块已经处理了错误状态更新
      console.error(`[refresh] Unexpected error in job ${ingestionJobId} for document ${id}:`, error);
    });

    return createSuccessResponse(
      {
        documentId: id,
        mode: "background_refresh",
      },
      "accepted"
    );
  }

  // PDF/Word 类型：需要用户重新上传文件
  console.log(`[refresh] Document ${id} (${document.sourceType}) requires reupload`);

  return createSuccessResponse(
    {
      documentId: id,
      mode: "need_reupload",
      sourceType: document.sourceType,
      title: document.title,
    },
    "need_reupload"
  );
});
