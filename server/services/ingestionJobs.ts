import { setDocumentStatus, updateDocument } from "~~/server/repositories/documentRepository";
import type { IngestionJobEvent, IngestionJobStage } from "~~/shared/ingestion";

type Listener = (event: IngestionJobEvent) => void;

// 内存中的任务订阅中心：用于 SSE 实时推送上传进度。
const listeners = new Map<string, Set<Listener>>();
const latestEvents = new Map<string, IngestionJobEvent>();

function emit(event: IngestionJobEvent): void {
  latestEvents.set(event.ingestionJobId, event);
  const subs = listeners.get(event.ingestionJobId);
  if (!subs) return;
  for (const sub of subs) sub(event);
}

export function publishJobEvent(event: IngestionJobEvent): void {
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

/**
 * 运行文档摄取任务
 * 
 * 统一管理任务的生命周期：
 * 1. 设置初始状态（processing + queued）
 * 2. 执行任务并推送进度事件
 * 3. 成功时更新为 active + completed
 * 4. 失败时更新为 failed 并记录错误
 * 
 * @param params.ingestionJobId - 任务 ID，用于 SSE 事件订阅
 * @param params.documentId - 文档 ID
 * @param params.task - 实际执行的任务函数，接收 emitStage 回调
 */
export async function runIngestionJob(params: {
  ingestionJobId: string;
  documentId: string;
  task: (emitStage: (stage: IngestionJobStage, progress: number, message?: string) => void) => Promise<void>;
}): Promise<void> {
  const { ingestionJobId, documentId, task } = params;

  /**
   * 阶段回调：推送 SSE 事件 + 更新数据库状态
   * 只在关键阶段更新数据库，减少 I/O
   */
  const emitStage = (stage: IngestionJobStage, progress: number, message?: string): void => {
    // 只在关键阶段更新数据库 currentStage
    if (["queued", "parsing", "chunking", "embedding", "indexing", "completed", "failed"].includes(stage)) {
      updateDocument(documentId, { currentStage: stage });
    }

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
    // 统一设置初始状态，避免重复更新
    updateDocument(documentId, {
      status: "processing",
      currentStage: "queued",
      errorMessage: null,
    });
    emitStage("queued", 0, "queued");

    // 执行实际的摄取任务
    await task(emitStage);

    // 成功：标记为 active，记录完成时间
    emitStage("completed", 100, "completed");
    updateDocument(documentId, {
      status: "active",
      currentStage: "completed",
      lastIngestedAt: Date.now(),
      errorMessage: null,
    });
  } catch (error) {
    // 失败：标记为 failed，记录错误信息供用户排查
    const message = error instanceof Error ? error.message : "ingestion failed";
    console.error(`[runIngestionJob] Job ${ingestionJobId} failed for document ${documentId}:`, error);
    
    emitStage("failed", 100, message);
    updateDocument(documentId, {
      status: "failed",
      currentStage: "failed",
      errorMessage: message,
    });
  }
}
