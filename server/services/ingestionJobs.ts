import { setDocumentStatus, updateDocument } from "~~/server/core/database";
import type { IngestionJobEvent, IngestionJobStage } from "~~/shared/ingestion";

type Listener = (event: IngestionJobEvent) => void;

// 内存中的任务订阅中心：用于 SSE 实时推送上传进度。
const listeners = new Map<string, Set<Listener>>();
const latestEvents = new Map<string, IngestionJobEvent>();

function emit(event: IngestionJobEvent) {
  latestEvents.set(event.ingestionJobId, event);
  const subs = listeners.get(event.ingestionJobId);
  if (!subs) return;
  for (const sub of subs) sub(event);
}

export function publishJobEvent(event: IngestionJobEvent) {
  emit(event);
}

export function subscribeJobEvents(ingestionJobId: string, listener: Listener): () => void {
  const subs = listeners.get(ingestionJobId) || new Set<Listener>();
  subs.add(listener);
  listeners.set(ingestionJobId, subs);

  return () => {
    const current = listeners.get(ingestionJobId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) listeners.delete(ingestionJobId);
  };
}

export function getLatestJobEvent(ingestionJobId: string): IngestionJobEvent | null {
  return latestEvents.get(ingestionJobId) || null;
}

export async function runIngestionJob(params: {
  ingestionJobId: string;
  documentId: string;
  task: (emitStage: (stage: IngestionJobStage, progress: number, message?: string) => void) => Promise<void>;
}) {
  const { ingestionJobId, documentId, task } = params;

  // 统一阶段回调：推送事件 + 落库 currentStage，避免前端强依赖 SSE。
  const emitStage = (stage: IngestionJobStage, progress: number, message?: string) => {
    updateDocument(documentId, {
      currentStage: stage,
      ...(stage === "queued" ? { status: "processing", errorMessage: null } : {}),
    });

    const event: IngestionJobEvent = {
      ingestionJobId,
      documentId,
      stage,
      progress,
      at: Date.now(),
    };
    
    if (message !== undefined) {
      event.message = message;
    }
    
    publishJobEvent(event);
  };

  try {
    // 文档主状态保持粗粒度：处理中 -> 成功/失败。
    setDocumentStatus(documentId, "processing");
    emitStage("queued", 0, "queued");

    await task(emitStage);

    emitStage("completed", 100, "completed");
    updateDocument(documentId, {
      status: "active",
      currentStage: "completed",
      lastIngestedAt: Date.now(),
      errorMessage: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ingestion failed";
    emitStage("failed", 100, message);
    updateDocument(documentId, {
      status: "failed",
      currentStage: "failed",
      errorMessage: message,
    });
  }
}
