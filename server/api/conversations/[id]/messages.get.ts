import { getMessagesPage } from "~~/server/core/database";
import { createError, defineEventHandler, getQuery, getRouterParam } from "h3";

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Missing conversation id" });

  const q = getQuery(event);
  const limit = q.limit ? Number(q.limit) : 50;
  const before = q.before ? Number(q.before) : undefined;

  const params: { conversationId: string; limit: number; beforeCreatedAt?: number } = {
    conversationId: id,
    limit,
  };
  
  if (before !== undefined) {
    params.beforeCreatedAt = before;
  }

  return getMessagesPage(params);
});
