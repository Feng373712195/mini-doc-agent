import { nanoid } from "nanoid";
import { createError, defineEventHandler, readMultipartFormData } from "h3";
import { createDocument } from "~~/server/core/database";
import { runIngestionJob } from "~~/server/services/ingestionJobs";
import { runUploadIngestion, saveUploadFile } from "~~/server/ingestion/runUploadIngestion";
import type { IngestionUploadResponse, IngestionUploadType } from "~~/shared/ingestion";

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

function assertUploadType(value: string | undefined): IngestionUploadType {
  if (value === "github" || value === "pdf" || value === "word") return value;
  throw createError({ statusCode: 400, statusMessage: "Invalid type, expected github|pdf|word" });
}

export default defineEventHandler(async (event): Promise<IngestionUploadResponse> => {
  const parts = (await readMultipartFormData(event)) as FormPart[] | undefined;
  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Missing multipart form data" });
  }

  const type = assertUploadType(readTextPart(parts, "type"));
  const ingestionJobId = nanoid();

  if (type === "github") {
    const repoUrl = readTextPart(parts, "repoUrl");
    const branch = readTextPart(parts, "branch") || null;
    if (!repoUrl) {
      throw createError({ statusCode: 400, statusMessage: "Missing repoUrl" });
    }

    const repo = repoUrl
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "");
    const title = repo.split("/").pop() || "github-repo";

    const document = createDocument({
      title,
      sourceType: "github",
      sourcePath: repoUrl,
      repo,
      branch,
      status: "uploading",
      ingestionJobId,
    });

    void runIngestionJob({
      ingestionJobId,
      documentId: document.documentId,
      task: async (emitStage) => {
        await runUploadIngestion({
          type: "github",
          documentId: document.documentId,
          repoUrl,
          branch,
          onStage: (stage, progress) => emitStage(stage, progress, stage),
        });
      },
    });

    return {
      code: 0,
      message: "accepted",
      data: {
        documentId: document.documentId,
        ingestionJobId,
        type,
        createdAt: document.createdAt,
      },
      timestamp: Date.now(),
    };
  }

  const filePart = findPart(parts, "file");
  if (!filePart?.filename || !filePart?.data) {
    throw createError({ statusCode: 400, statusMessage: "Missing file" });
  }

  const document = createDocument({
    title: filePart.filename,
    sourceType: type,
    sourcePath: filePart.filename,
    status: "uploading",
    ingestionJobId,
  });

  const filePath = await saveUploadFile({
    ingestionJobId,
    filename: filePart.filename,
    data: filePart.data,
  });

  void runIngestionJob({
    ingestionJobId,
    documentId: document.documentId,
    task: async (emitStage) => {
      await runUploadIngestion({
        type,
        documentId: document.documentId,
        filePath,
        fileBuffer: filePart.data,
        onStage: (stage, progress) => emitStage(stage, progress, stage),
      });
    },
  });

  return {
    code: 0,
    message: "accepted",
    data: {
      documentId: document.documentId,
      ingestionJobId,
      type,
      createdAt: document.createdAt,
    },
    timestamp: Date.now(),
  };
});
