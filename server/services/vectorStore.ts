import path from "node:path";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Document } from "langchain/document";
import { createEmbeddings } from "./embeddings";

const DOCS_DIR = path.resolve("docs");
const VECTOR_DIR = path.resolve("vector-store");

let vectorStorePromise: Promise<any> | null = null;

async function getHNSWLib() {
  const mod = await import("@langchain/community/vectorstores/hnswlib");
  return mod.HNSWLib;
}

async function loadAndSplitDocs(): Promise<Document[]> {
  const loader = new DirectoryLoader(DOCS_DIR, {
    ".md": (filePath) => new TextLoader(filePath),
  });
  const docs = await loader.load();
  if (docs.length === 0) throw new Error(`No .md docs found in ${DOCS_DIR}`);
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 100 });
  return splitter.splitDocuments(docs);
}

export async function loadOrCreateVectorStore() {
  if (vectorStorePromise) return vectorStorePromise;
  vectorStorePromise = (async () => {
    const HNSWLib = await getHNSWLib();
    const embeddings = createEmbeddings();
    try {
      return await HNSWLib.load(VECTOR_DIR, embeddings);
    } catch {
      const chunks = await loadAndSplitDocs();
      const store = await HNSWLib.fromDocuments(chunks, embeddings);
      await store.save(VECTOR_DIR);
      return store;
    }
  })();
  return vectorStorePromise;
}

