import path from "node:path";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";
import { createEmbeddings } from "~~/server/services/embeddings";
import type { IngestionChunk } from "~~/server/ingestion/chunks/chunkDocuments";

type SearchFilter = Partial<{
  documentId: string;
  sourceType: "github" | "pdf" | "word";
  branch: string | null;
  type: string;
}>;

export type VectorStoreService = {
  upsertChunks: (chunks: IngestionChunk[], vectors: number[][]) => Promise<void>;
  similaritySearch: (
    query: string,
    k?: number,
    filter?: SearchFilter,
  ) => Promise<Array<{ pageContent: string; metadata: any }>>;
  deleteByDocumentId: (documentId: string) => Promise<void>;
};

const CHROMA_COLLECTION = "doc_agent_knowledge";
const CHROMA_PERSIST_DIR = path.resolve("chroma-data");

let vectorStorePromise: Promise<Chroma> | null = null;

async function getChromaStore() {
  if (vectorStorePromise) return vectorStorePromise;

  vectorStorePromise = Chroma.fromExistingCollection(createEmbeddings(), {
    collectionName: CHROMA_COLLECTION,
    url: process.env.CHROMA_URL || "http://localhost:8000",
    collectionMetadata: { "hnsw:space": "cosine", persist_directory: CHROMA_PERSIST_DIR },
  }).catch(async () => {
    const store = new Chroma(createEmbeddings(), {
      collectionName: CHROMA_COLLECTION,
      url: process.env.CHROMA_URL || "http://localhost:8000",
      collectionMetadata: { "hnsw:space": "cosine", persist_directory: CHROMA_PERSIST_DIR },
    });
    await store.ensureCollection();
    return store;
  });

  return vectorStorePromise;
}

function buildFilter(filter?: SearchFilter) {
  if (!filter) return undefined;
  const result: Record<string, unknown> = {};
  if (filter.documentId) result.documentId = filter.documentId;
  if (filter.sourceType) result.sourceType = filter.sourceType;
  if (typeof filter.branch === "string") result.branch = filter.branch;
  if (filter.type) result.type = filter.type;
  return Object.keys(result).length ? result : undefined;
}

export async function getVectorStoreService(): Promise<VectorStoreService> {
  const store = await getChromaStore();

  return {
    async upsertChunks(chunks, vectors) {
      if (chunks.length === 0) return;
      const docs = chunks.map(
        (chunk) =>
          new Document({
            pageContent: chunk.content,
            metadata: chunk.metadata,
          }),
      );
      await store.addVectors(
        vectors,
        docs,
        { ids: chunks.map((item) => item.chunkId) },
      );
    },

    async similaritySearch(query, k = 3, filter) {
      return store.similaritySearch(query, k, buildFilter(filter));
    },

    async deleteByDocumentId(documentId) {
      await store.delete({ filter: { documentId } });
    },
  };
}
