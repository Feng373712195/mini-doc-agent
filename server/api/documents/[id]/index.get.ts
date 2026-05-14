import { createError, defineEventHandler, getRouterParam } from "h3";
import { getDocumentById } from "~~/server/repositories/documentRepository";

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing document id" });
  }

  const document = getDocumentById(id);
  if (!document) {
    throw createError({ statusCode: 404, statusMessage: "Document not found" });
  }

  return {
    code: 0,
    message: "ok",
    data: document,
    timestamp: Date.now(),
  };
});
