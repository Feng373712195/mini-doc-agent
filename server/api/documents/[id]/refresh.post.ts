import { createError, defineEventHandler, getRouterParam } from "h3";
import { getDocumentById } from "~~/server/core/database";
import { runIngestionJob } from "~~/server/services/ingestionJobs";
import { runUploadIngestion } from "~~/server/ingestion/runUploadIngestion";

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

  const ingestionJobId = `refresh-${id}-${Date.now()}`;

  if (document.sourceType === "github") {
    if (!document.sourcePath) {
      throw createError({ statusCode: 400, statusMessage: "Missing repoUrl in sourcePath" });
    }

    void runIngestionJob({
      ingestionJobId,
      documentId: id,
      task: async (emitStage) => {
        await runUploadIngestion({
          type: "github",
          documentId: id,
          repoUrl: document.sourcePath,
          branch: document.branch,
          onStage: (stage, progress) => emitStage(stage, progress, stage),
        });
      },
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
