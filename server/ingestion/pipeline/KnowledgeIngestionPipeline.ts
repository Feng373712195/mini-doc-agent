import { chunkDocuments } from "~~/server/ingestion/chunks/chunkDocuments";
import type { IDataSource } from "~~/server/ingestion/sources/IDataSource";
import { createEmbeddings } from "~~/server/services/embeddings";
import { getVectorStoreService } from "~~/server/services/vectorStore";

export class KnowledgeIngestionPipeline {
  async ingest(
    source: IDataSource,
    onStage?: (stage: "parsing" | "chunking" | "embedding" | "indexing", progress: number) => void,
  ) {
    onStage?.("parsing", 20);
    const documents = await source.load();

    onStage?.("chunking", 45);
    const chunks = await chunkDocuments(documents);

    onStage?.("embedding", 70);
    const embeddings = createEmbeddings();
    const vectors = await embeddings.embedDocuments(chunks.map((item) => item.content));

    onStage?.("indexing", 90);
    const vectorStore = await getVectorStoreService();
    await vectorStore.upsertChunks(chunks, vectors);

    onStage?.("indexing", 100);
    return { documents, chunks };
  }
}
