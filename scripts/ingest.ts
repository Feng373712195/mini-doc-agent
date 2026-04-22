import "dotenv/config";
import path from "node:path";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const DOCS_DIR = path.resolve("docs");
const VECTOR_DIR = path.resolve("vector-store");

function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

class OpenAICompatEmbeddings {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly dimensions?: number;

  constructor(options: { apiKey: string; model: string; baseUrl: string; dimensions?: number }) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = options.baseUrl;
    this.dimensions = options.dimensions;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const batches = chunkArray(texts, 64);
    const allVectors: number[][] = [];
    for (const batch of batches) {
      const payload: Record<string, unknown> = { model: this.model, input: batch };
      if (this.dimensions) payload.dimensions = this.dimensions;
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embeddings request failed: ${response.status} ${errorText}`);
      }
      const data = (await response.json()) as { data: Array<{ embedding: number[]; index: number }> };
      const batchVectors = new Array(batch.length);
      for (const item of data.data) batchVectors[item.index] = item.embedding;
      allVectors.push(...(batchVectors as number[][]));
    }
    return allVectors;
  }
}

async function main() {
  const embeddingApiKey = process.env.EMBEDDING_API_KEY;
  const embeddingModel = process.env.EMBEDDING_MODEL || "embedding-3";
  const embeddingBaseUrl =
    process.env.EMBEDDING_BASE_URL || "https://open.bigmodel.cn/api/paas/v4/embeddings";
  const embeddingDimensions = process.env.EMBEDDING_DIMENSIONS
    ? Number(process.env.EMBEDDING_DIMENSIONS)
    : undefined;

  if (!embeddingApiKey) throw new Error("Missing EMBEDDING_API_KEY in .env");

  const embeddings = new OpenAICompatEmbeddings({
    apiKey: embeddingApiKey,
    model: embeddingModel,
    baseUrl: embeddingBaseUrl,
    dimensions: embeddingDimensions,
  });

  const { HNSWLib } = await import("@langchain/community/vectorstores/hnswlib");

  const loader = new DirectoryLoader(DOCS_DIR, { ".md": (filePath) => new TextLoader(filePath) });
  const docs = await loader.load();
  if (!docs.length) throw new Error(`No .md docs found in ${DOCS_DIR}`);

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 100 });
  const chunks = await splitter.splitDocuments(docs);

  console.log(
    JSON.stringify(
      {
        chunkCount: chunks.length,
        chunks: chunks.map((doc, index) => ({
          id: index,
          content: doc.pageContent,
          metadata: doc.metadata,
        })),
      },
      null,
      2
    )
  );

  const store = await (HNSWLib as any).fromDocuments(chunks, embeddings as any);
  await store.save(VECTOR_DIR);
  console.log("\nHNSWLib vector index saved to ./vector-store");
}

main().catch((err) => {
  console.error("ingest failed:", err);
  process.exit(1);
});

