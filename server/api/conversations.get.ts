import { listConversations } from "~~/server/core/database";
import { defineEventHandler, getQuery } from "h3";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const limit = query.limit ? Number(query.limit) : 50;
  const offset = query.offset ? Number(query.offset) : 0;
  return listConversations(Math.min(Math.max(limit, 1), 200), Math.max(offset, 0));
});
