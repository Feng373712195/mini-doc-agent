import { createError, defineEventHandler, getRouterParam } from "h3";
import { getDocumentById, updateDocument } from "~~/server/core/database";
import { runUploadIngestion } from "~~/server/ingestion/runUploadIngestion";

async function runGithubRefresh(input: {
  documentId: string;
  repoUrl: string;
  branch: string | null;
  previousStatus: "active" | "inactive" | "failed";
}) {
  try {
    await runUploadIngestion({
      type: "github",
      documentId: input.documentId,
      repoUrl: input.repoUrl,
      branch: input.branch,
    });
    updateDocument(input.documentId, {
      status: "active",
      currentStage: "completed",
      errorMessage: null,
      updatedAt: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "refresh failed";
    updateDocument(input.documentId, {
      status: input.previousStatus,
      currentStage: "failed",
      errorMessage: message,
      updatedAt: Date.now(),
    });
  }
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing document id" });
  }

  const document = getDocumentById(id);
  if (!document) {
    throw createError({ statusCode: 404, statusMessage: "Document not found" });
  }

  if (!["active", "inactive", "failed"].includes(document.status)) {
    throw createError({ statusCode: 409, statusMessage: "Document status does not allow refresh" });
  }

  const previousStatus = document.status as "active" | "inactive" | "failed";

  if (document.sourceType === "github") {
    if (!document.sourcePath) {
      throw createError({ statusCode: 400, statusMessage: "Missing repoUrl in sourcePath" });
    }

    updateDocument(id, {
      status: "processing",
      currentStage: "queued",
      errorMessage: null,
    });

    void runGithubRefresh({
      documentId: id,
      repoUrl: document.sourcePath,
      branch: document.branch,
      previousStatus,
    });

    return {
      code: 0,
      message: "accepted",
      data: {
        documentId: id,
        mode: "background_refresh",
      },
      timestamp: Date.now(),
    };
  }

  // PDF/Word 走重新上传路径：前端复用上传弹窗并预选类型。
  return {
    code: 0,
    message: "need_reupload",
    data: {
      documentId: id,
      mode: "need_reupload",
      sourceType: document.sourceType,
      title: document.title,
    },
    timestamp: Date.now(),
  };
});
