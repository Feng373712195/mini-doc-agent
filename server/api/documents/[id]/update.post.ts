import {
  createError,
  defineEventHandler,
  getRouterParam,
  readFormData,
} from "h3";
import { getDocumentById, setDocumentStatus } from "~~/server/core/database";
import { runIngestionJob } from "~~/server/services/ingestionJobs";
import { runUploadIngestion } from "~~/server/ingestion/runUploadIngestion";
import type { IngestionUploadType } from "~~/server/ingestion/runUploadIngestion";

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
      statusMessage: "Document status does not allow update",
    });
  }

  const formData = await readFormData(event);
  const type = formData.get("type") as IngestionUploadType;
  if (!type) {
    throw createError({ statusCode: 400, statusMessage: "Missing type" });
  }

  const ingestionJobId = `update-${id}-${Date.now()}`;

  void runIngestionJob({
    ingestionJobId,
    documentId: id,
    task: async (emitStage) => {
      await runUploadIngestion({
        type,
        documentId: id,
        repoUrl: formData.get("repoUrl") as string | undefined,
        branch: formData.get("branch") as string | undefined,
        file: formData.get("file") as File | undefined,
        onStage: (stage, progress, message) =>
          emitStage(stage, progress, message),
      });
    },
  });

  return {
    code: 0,
    message: "accepted",
    data: {
      ingestionJobId,
    },
    timestamp: Date.now(),
  };
});
