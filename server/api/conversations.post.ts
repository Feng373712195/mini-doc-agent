import { createConversation } from "~/server/utils/db";
import { defineEventHandler, readBody } from "h3";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ title?: string }>(event);
  return createConversation(body?.title);
});
