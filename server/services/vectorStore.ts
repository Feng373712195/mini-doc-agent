import path from "node:path";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Document } from "langchain/document";
import { createEmbeddings } from "./embeddings";

const DOCS_DIR = path.resolve("docs");
const VECTOR_DIR = path.resolve("vector-store");

// 单例模式：确保向量存储只初始化一次
let vectorStorePromise: Promise<any> | null = null;

/**
 * 动态导入 HNSWLib
 * 避免在不需要时加载 native 模块
 */
async function getHNSWLib() {
  const mod = await import("@langchain/community/vectorstores/hnswlib");
  return mod.HNSWLib;
}

/**
 * 加载并切分文档
 * 从 docs/ 目录读取所有 .md 文件，切分成小块用于向量化
 */
async function loadAndSplitDocs(): Promise<Document[]> {
  const loader = new DirectoryLoader(DOCS_DIR, {
    ".md": (filePath) => new TextLoader(filePath),
  });
  const docs = await loader.load();
  if (docs.length === 0) throw new Error(`No .md docs found in ${DOCS_DIR}`);
  
  // 切分文档：每块 500 字符，重叠 100 字符（保证上下文连贯性）
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 100 });
  return splitter.splitDocuments(docs);
}

/**
 * 加载或创建向量存储
 * 优先从磁盘加载已有索引，不存在则重新构建
 * @returns 向量存储实例
 */
export async function loadOrCreateVectorStore() {
  // 单例模式：避免重复初始化
  if (vectorStorePromise) return vectorStorePromise;
  
  vectorStorePromise = (async () => {
    const HNSWLib = await getHNSWLib();
    const embeddings = createEmbeddings();
    try {
      // 尝试从磁盘加载已有索引
      return await HNSWLib.load(VECTOR_DIR, embeddings);
    } catch {
      // 索引不存在，重新构建并保存
      const chunks = await loadAndSplitDocs();
      const store = await HNSWLib.fromDocuments(chunks, embeddings);
      await store.save(VECTOR_DIR);
      return store;
    }
  })();
  return vectorStorePromise;
}

