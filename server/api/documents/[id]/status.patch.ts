import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { getDocumentById, updateDocument } from "~~/server/repositories/documentRepository";
import { createSuccessResponse } from "~~/server/utils/response";
import type { DocumentStatus } from "~~/shared/document";

type Body = {
  status?: DocumentStatus;
};

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing document id" });
  }

  const body = await readBody<Body>(event);
  const nextStatus = body?.status;
  if (nextStatus !== "active" && nextStatus !== "inactive") {
    throw createError({ statusCode: 400, statusMessage: "Only active/inactive are allowed" });
  }

  const document = getDocumentById(id);
  if (!document) {
    throw createError({ statusCode: 404, statusMessage: "Document not found" });
  }

  if (["uploading", "processing", "deleting"].includes(document.status)) {
    throw createError({ statusCode: 409, statusMessage: "Document is busy, cannot change status" });
  }

  updateDocument(id, {
    status: nextStatus,
    errorMessage: null,
  });

  return createSuccessResponse({
    documentId: id,
    status: nextStatus,
  });
});
