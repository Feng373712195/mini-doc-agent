import { createConversation } from "~~/server/core/database";
import { defineEventHandler, readBody } from "h3";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ title?: string }>(event);
  return createConversation(body?.title);
});
