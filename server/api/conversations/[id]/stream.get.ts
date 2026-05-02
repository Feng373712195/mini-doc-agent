import { getLatestUserMessage, getMessages, updateMessageContent } from "~~/server/utils/db";
import { retrieveContexts } from "~~/server/utils/rag/retrieve";
import { streamChatText } from "~~/server/utils/llm/chat";
import type { Message } from "~~/shared/chat";
import {
  createError,
  defineEventHandler,
  getQuery,
  getRouterParam,
  setResponseHeaders,
} from "h3";

function sseWrite(res: any, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default defineEventHandler(async (event) => {
  const conversationId = getRouterParam(event, "id");
  if (!conversationId) throw createError({ statusCode: 400, statusMessage: "Missing conversation id" });

  const query = getQuery(event);
  const assistantMessageId = String(query.assistantMessageId || "");
  if (!assistantMessageId) {
    throw createError({ statusCode: 400, statusMessage: "Missing assistantMessageId" });
  }

  setResponseHeaders(event, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const res = event.node.res;
  const req = event.node.req;

  res.write(":\n\n"); // comment line to establish stream
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  const latestUser = getLatestUserMessage(conversationId);
  if (!latestUser) {
    sseWrite(res, "error", { message: "No user message found for this conversation." });
    res.end();
    return;
  }

  const { context, matches } = await retrieveContexts(latestUser.content, 3);
  const prompt = `你是一个文档问答助手。请严格根据提供的上下文回答。\n如果上下文不足，请明确说“文档中没有足够信息”。\n\n问题：${latestUser.content}\n\n上下文：\n${context}`;

  sseWrite(res, "message_start", { assistantMessageId, contexts: matches });

  // Seed assistant content from DB in case of reconnect.
  const existing = getMessages(conversationId).find((m: Message) => m.id === assistantMessageId);
  let fullText = existing?.content || "";

  let lastFlushAt = 0;
  const flush = () => {
    updateMessageContent(assistantMessageId, fullText);
    lastFlushAt = Date.now();
  };

  try {
    for await (const delta of streamChatText(prompt)) {
      if (closed) break;
      fullText += delta;
      sseWrite(res, "delta", { text: delta });

      const now = Date.now();
      if (now - lastFlushAt > 200) flush();
    }
    flush();
    if (!closed) sseWrite(res, "message_end", { assistantMessageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    sseWrite(res, "error", { message });
  } finally {
    res.end();
  }
});
