import { nanoid } from "nanoid";
import { createError, defineEventHandler, readMultipartFormData } from "h3";
import { createDocument } from "~~/server/core/database";
import { runIngestionJob } from "~~/server/services/ingestionJobs";
import { runUploadIngestion, saveUploadFile } from "~~/server/ingestion/runUploadIngestion";
import { isDocumentSourceType } from "~~/server/utils/typeGuards";
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

export default defineEventHandler(async (event): Promise<IngestionUploadResponse> => {
  // 统一上传入口：通过 multipart + type 分发不同来源
  const parts = (await readMultipartFormData(event)) as FormPart[] | undefined;
  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Missing multipart form data" });
  }

  const typeValue = readTextPart(parts, "type");
  if (!isDocumentSourceType(typeValue)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid type, expected github|pdf|word" });
  }
  const type: IngestionUploadType = typeValue;
  const ingestionJobId = nanoid();

  if (type === "github") {
    // GitHub 模式：仅接收仓库地址与可选分支
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
        // 真正的 ingestion 在后台执行，接口先快速返回
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

  const fileBuffer = filePart.data;

  void runIngestionJob({
    ingestionJobId,
    documentId: document.documentId,
    task: async (emitStage) => {
      // 文件来源统一走 pipeline，阶段由 onStage 回传
      await runUploadIngestion({
        type,
        documentId: document.documentId,
        filePath,
        fileBuffer,
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
