import { setDocumentStatus, updateDocument } from "~~/server/core/database";
import type { IngestionJobEvent, IngestionJobStage } from "~~/shared/ingestion";

type Listener = (event: IngestionJobEvent) => void;

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

  const emitStage = (stage: IngestionJobStage, progress: number, message?: string) => {
    publishJobEvent({
      ingestionJobId,
      documentId,
      stage,
      progress,
      message,
      at: Date.now(),
    });
  };

  try {
    setDocumentStatus(documentId, "processing");
    emitStage("queued", 0, "queued");
    await task(emitStage);
    emitStage("completed", 100, "completed");
    updateDocument(documentId, {
      status: "active",
      lastIngestedAt: Date.now(),
      errorMessage: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ingestion failed";
    emitStage("failed", 100, message);
    setDocumentStatus(documentId, "failed", message);
  }
}
