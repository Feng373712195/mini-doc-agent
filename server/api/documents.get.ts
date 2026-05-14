import { createError, defineEventHandler, getQuery } from "h3";
import { listDocuments } from "~~/server/repositories/documentRepository";
import { createSuccessResponse } from "~~/server/utils/response";
import { PAGINATION_CONFIG } from "~~/server/config";
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
  const pageSize = Number(query.pageSize || PAGINATION_CONFIG.defaultPageSize);
  const status = String(query.status || "all") as DocumentStatus | "all";

  if (!ALLOWED_STATUS.has(status)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid status filter" });
  }

  const result = listDocuments({ page, pageSize, status });
  return createSuccessResponse({
    items: result.items,
    pagination: {
      page,
      pageSize,
      total: result.total,
    },
  });
});
