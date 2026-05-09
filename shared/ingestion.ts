import type { DocumentRecord, DocumentSourceType } from "~~/shared/document";

export type IngestionUploadType = DocumentSourceType;

export type IngestionUploadAccepted = {
  documentId: string;
  ingestionJobId: string;
  type: IngestionUploadType;
  createdAt: number;
};

export type IngestionUploadResponse = {
  code: number;
  message: string;
  data: IngestionUploadAccepted;
  timestamp: number;
};

export type IngestionJobStage =
  | "queued"
  | "parsing"
  | "chunking"
  | "embedding"
  | "indexing"
  | "completed"
  | "failed";

export type IngestionJobEvent = {
  ingestionJobId: string;
  documentId: string;
  stage: IngestionJobStage;
  progress: number;
  message?: string;
  at: number;
};

export type IngestionContext = {
  document: DocumentRecord;
  ingestionJobId: string;
};
