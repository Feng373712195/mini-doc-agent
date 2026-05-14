import { createError, defineEventHandler, getRouterParam } from "h3";
import { getDocumentById } from "~~/server/repositories/documentRepository";
import { createSuccessResponse } from "~~/server/utils/response";

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing document id" });
  }

  const document = getDocumentById(id);
  if (!document) {
    throw createError({ statusCode: 404, statusMessage: "Document not found" });
  }

  return createSuccessResponse(document);
});
