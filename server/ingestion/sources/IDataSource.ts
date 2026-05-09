export type SourceType = "github" | "pdf" | "word";

export interface RawDocument {
  id: string;
  documentId: string;
  title: string;
  content: string;
  metadata: {
    sourceType: SourceType;
    sourcePath: string | null;
    repo: string | null;
    branch: string | null;
    filePath: string | null;
    symbol: "function" | "class" | "unknown";
    type: string;
  };
}

export interface IDataSource {
  load(): Promise<RawDocument[]>;
}
