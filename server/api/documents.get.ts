import { createError, defineEventHandler, getQuery } from "h3";
import { getDocumentById, listDocuments } from "~~/server/core/database";
import type { DocumentStatus } from "~~/shared/document";

const ALLOWED_STATUS = new Set<DocumentStatus | "all">([
  "all",
  "uploading",
  "processing",
  "active",
  "failed",
  "deleting",
  "inactive",
]);

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 3);
  const status = String(query.status || "all") as DocumentStatus | "all";

  if (!ALLOWED_STATUS.has(status)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid status filter" });
  }

  const result = listDocuments({ page, pageSize, status });
  return {
    code: 0,
    message: "ok",
    data: {
      items: result.items,
      pagination: {
        page,
        pageSize,
        total: result.total,
      },
    },
    timestamp: Date.now(),
  };
});
