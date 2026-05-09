import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import type { IDataSource, RawDocument } from "~~/server/ingestion/sources/IDataSource";
import { loadPdfAsText } from "~~/server/ingestion/loaders/PDFLoader";

export class PDFSource implements IDataSource {
  constructor(
    private readonly filePath: string,
    private readonly documentId: string,
    private readonly sourcePath: string | null,
  ) {}

  async load(): Promise<RawDocument[]> {
    await fs.access(this.filePath);
    const content = await loadPdfAsText(this.filePath);
    return [
      {
        id: nanoid(),
        documentId: this.documentId,
        title: path.basename(this.filePath),
        content,
        metadata: {
          sourceType: "pdf",
          sourcePath: this.sourcePath,
          repo: null,
          branch: null,
          filePath: path.basename(this.filePath),
          symbol: "unknown",
          type: "pdf",
        },
      },
    ];
  }
}
