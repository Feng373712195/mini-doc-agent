export type DocumentSourceType = "github" | "pdf" | "word";

export type DocumentStatus =
  | "uploading"
  | "processing"
  | "active"
  | "failed"
  | "deleting"
  | "inactive";

export type DocumentStage =
  | "queued"
  | "parsing"
  | "chunking"
  | "embedding"
  | "indexing"
  | "completed"
  | "failed";

export type DocumentRecord = {
  documentId: string;
  title: string;
  sourceType: DocumentSourceType;
  sourcePath: string | null;
  repo: string | null;
  branch: string | null;
  contentHash: string | null;
  commitHash: string | null;
  version: string | null;
  status: DocumentStatus;
  currentStage: DocumentStage | null;
  chunkCount: number;
  errorMessage: string | null;
  ingestionJobId: string | null;
  createdAt: number;
  updatedAt: number;
  lastIngestedAt: number | null;
  deletedAt: number | null;
};

export type CreateDocumentInput = {
  title: string;
  sourceType: DocumentSourceType;
  sourcePath?: string | null;
  repo?: string | null;
  branch?: string | null;
  contentHash?: string | null;
  commitHash?: string | null;
  version?: string | null;
  status: DocumentStatus;
  ingestionJobId?: string | null;
};

export type UpdateDocumentInput = Partial<
  Omit<DocumentRecord, "documentId" | "createdAt">
>;
