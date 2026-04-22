import { getMessages } from "~/server/utils/db";
import { createError, defineEventHandler, getRouterParam } from "h3";

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Missing conversation id" });
  return getMessages(id);
});
