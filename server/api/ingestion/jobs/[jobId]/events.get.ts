import { defineEventHandler, getRouterParam, setResponseHeaders } from "h3";
import { getLatestJobEvent, subscribeJobEvents } from "~~/server/services/ingestionJobs";

/**
 * SSE 响应对象类型
 */
interface SSEResponse {
  write: (data: string) => void;
  flushHeaders?: () => void;
  end: () => void;
}

function writeEvent(res: SSEResponse, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default defineEventHandler(async (event) => {
  const ingestionJobId = getRouterParam(event, "jobId");
  if (!ingestionJobId) {
    throw new Error("Missing ingestion job id");
  }

  setResponseHeaders(event, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const res = event.node.res as SSEResponse;
  const req = event.node.req;
  let closed = false;

  req.on("close", () => {
    closed = true;
  });

  res.write(":\n\n");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const latest = getLatestJobEvent(ingestionJobId);
  if (latest) writeEvent(res, "progress", latest);

  const unsubscribe = subscribeJobEvents(ingestionJobId, (payload) => {
    if (closed) return;
    writeEvent(res, "progress", payload);
    if (payload.stage === "completed" || payload.stage === "failed") {
      unsubscribe();
      res.end();
    }
  });
});
