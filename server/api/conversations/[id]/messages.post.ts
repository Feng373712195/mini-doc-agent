import { insertMessage, setConversationTitle } from "~~/server/utils/db";
import { createError, defineEventHandler, getRouterParam, readBody } from "h3";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Missing conversation id" });

  const body = await readBody<{ content?: string }>(event);
  const content = String(body?.content || "").trim();
  if (!content) throw createError({ statusCode: 400, statusMessage: "Missing content" });

  const userMsg = insertMessage({ conversationId: id, role: "user", content });
  const assistantMsg = insertMessage({ conversationId: id, role: "assistant", content: "" });

  // Best-effort: set title from the first user message snippet.
  setConversationTitle(id, content.slice(0, 32));

  return { userMessageId: userMsg.id, assistantMessageId: assistantMsg.id };
});
