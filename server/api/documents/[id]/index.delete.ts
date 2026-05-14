import { createError, defineEventHandler, getRouterParam } from "h3";
import {
  deleteDocumentById,
  getDocumentById,
  setDocumentStatus,
} from "~~/server/repositories/documentRepository";
import { getVectorStoreService } from "~~/server/services/vectorStore";

async function runDeleteDocument(documentId: string, previousStatus: "active" | "inactive" | "failed") {
  try {
    const vectorStore = await getVectorStoreService();
    await vectorStore.deleteByDocumentId(documentId);
    deleteDocumentById(documentId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete failed";
    setDocumentStatus(documentId, previousStatus, message);
  }
}

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
    throw createError({ statusCode: 409, statusMessage: "Document status does not allow delete" });
  }

  const previousStatus = document.status as "active" | "inactive" | "failed";
  setDocumentStatus(id, "deleting");

  // 删除流程异步执行，接口快速返回受理状态。
  void runDeleteDocument(id, previousStatus);

  return {
    code: 0,
    message: "accepted",
    data: {
      documentId: id,
      status: "deleting",
    },
    timestamp: Date.now(),
  };
});
