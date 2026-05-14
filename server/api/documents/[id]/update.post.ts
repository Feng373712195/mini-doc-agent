import {
  createError,
  defineEventHandler,
  getRouterParam,
  readMultipartFormData,
} from "h3";
import { getDocumentById } from "~~/server/repositories/documentRepository";
import { createSuccessResponse } from "~~/server/utils/response";
import { runIngestionJob } from "~~/server/services/ingestionJobs";
import { runUploadIngestion, saveUploadFile } from "~~/server/ingestion/runUploadIngestion";
import { isDocumentSourceType } from "~~/server/utils/typeGuards";
import type { IngestionUploadType } from "~~/shared/ingestion";

type FormPart = {
  name?: string;
  data?: Buffer;
  filename?: string;
};

function findPart(parts: FormPart[], name: string): FormPart | undefined {
  return parts.find((part) => part.name === name);
}

function readTextPart(parts: FormPart[], name: string): string | undefined {
  const part = findPart(parts, name);
  if (!part?.data) return undefined;
  return part.data.toString("utf8").trim();
}

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

  const parts = (await readMultipartFormData(event)) as FormPart[] | undefined;
  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Missing multipart form data" });
  }

  const typeValue = readTextPart(parts, "type");
  if (!isDocumentSourceType(typeValue)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid type, expected github|pdf|word" });
  }
  const type: IngestionUploadType = typeValue;

  const ingestionJobId = `update-${id}-${Date.now()}`;

  // GitHub 类型：只需要 repoUrl 和 branch
  if (type === "github") {
    const repoUrl = readTextPart(parts, "repoUrl");
    const branch = readTextPart(parts, "branch") || null;

    if (!repoUrl) {
      throw createError({ statusCode: 400, statusMessage: "Missing repoUrl for GitHub update" });
    }

    void runIngestionJob({
      ingestionJobId,
      documentId: id,
      task: async (emitStage) => {
        await runUploadIngestion({
          type: "github",
          documentId: id,
          repoUrl,
          branch,
          onStage: (stage, progress) => emitStage(stage, progress, stage),
        });
      },
    });

    return createSuccessResponse({
      ingestionJobId,
    }, "accepted");
  }

  // PDF/Word 类型：需要文件上传
  const filePart = findPart(parts, "file");
  if (!filePart?.filename || !filePart?.data) {
    throw createError({ statusCode: 400, statusMessage: "Missing file for PDF/Word update" });
  }

  const filePath = await saveUploadFile({
    ingestionJobId,
    filename: filePart.filename,
    data: filePart.data,
  });

  const fileBuffer = filePart.data;

  void runIngestionJob({
    ingestionJobId,
    documentId: id,
    task: async (emitStage) => {
      await runUploadIngestion({
        type,
        documentId: id,
        filePath,
        fileBuffer,
        onStage: (stage, progress) => emitStage(stage, progress, stage),
      });
    },
  });

  return createSuccessResponse({
    ingestionJobId,
  }, "accepted");
});
