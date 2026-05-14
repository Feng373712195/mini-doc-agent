import { setDocumentStatus, updateDocument } from "~~/server/repositories/documentRepository";
import type { IngestionJobEvent, IngestionJobStage } from "~~/shared/ingestion";

type Listener = (event: IngestionJobEvent) => void;

/**
 * 内存中的任务订阅中心
 * 
 * 用于 SSE 实时推送上传进度，采用发布-订阅模式：
 * - listeners: 存储每个任务的订阅者列表
 * - latestEvents: 缓存每个任务的最新事件，供新订阅者获取
 * 
 * 注意：这是内存存储，服务重启后会丢失，但不影响功能
 * 因为任务状态已持久化到数据库（documents.status 和 currentStage）
 */
const listeners = new Map<string, Set<Listener>>();
const latestEvents = new Map<string, IngestionJobEvent>();

/**
 * 发送事件到所有订阅者
 * 内部函数，由 publishJobEvent 调用
 */
function emit(event: IngestionJobEvent): void {
  latestEvents.set(event.ingestionJobId, event);
  const subs = listeners.get(event.ingestionJobId);
  if (!subs) return;
  for (const sub of subs) sub(event);
}

/**
 * 发布任务事件
 * 将事件推送给所有订阅该任务的客户端（通过 SSE）
 * 
 * @param event - 任务事件，包含任务ID、阶段、进度等信息
 */
export function publishJobEvent(event: IngestionJobEvent): void {
  emit(event);
}

/**
 * 订阅任务事件
 * 用于 SSE 连接，客户端可实时接收任务进度更新
 * 
 * @param ingestionJobId - 任务 ID
 * @param listener - 事件监听器函数
 * @returns 取消订阅函数，调用后停止接收事件
 */
export function subscribeJobEvents(ingestionJobId: string, listener: Listener): () => void {
  const subs = listeners.get(ingestionJobId) || new Set<Listener>();
  subs.add(listener);
  listeners.set(ingestionJobId, subs);

  // 返回取消订阅函数
  return () => {
    const current = listeners.get(ingestionJobId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) listeners.delete(ingestionJobId);
  };
}

/**
 * 获取任务的最新事件
 * 用于新订阅者获取当前进度，避免错过之前的事件
 * 
 * @param ingestionJobId - 任务 ID
 * @returns 最新事件，如果任务不存在则返回 null
 */
export function getLatestJobEvent(ingestionJobId: string): IngestionJobEvent | null {
  return latestEvents.get(ingestionJobId) || null;
}

/**
 * 清理指定任务的事件和监听器
 * 在任务完成后调用，释放内存，防止内存泄漏
 * 
 * @param ingestionJobId - 任务 ID
 */
export function cleanupJobEvents(ingestionJobId: string): void {
  latestEvents.delete(ingestionJobId);
  listeners.delete(ingestionJobId);
}

/**
 * 运行文档摄取任务
 * 
 * 统一管理任务的生命周期：
 * 1. 设置初始状态（processing + queued）
 * 2. 执行任务并推送进度事件
 * 3. 成功时更新为 active + completed
 * 4. 失败时更新为 failed 并记录错误
 * 5. 延迟清理内存，防止内存泄漏
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
  } finally {
    // 任务完成后延迟清理内存，确保客户端已接收完所有事件
    // 延迟 60 秒清理，给客户端足够的时间接收最后的事件
    setTimeout(() => {
      cleanupJobEvents(ingestionJobId);
    }, 60000);
  }
}
