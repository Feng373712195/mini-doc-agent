import { chunkDocuments } from "~~/server/ingestion/chunks/chunkDocuments";
import type { IDataSource } from "~~/server/ingestion/sources/IDataSource";
import { createEmbeddings } from "~~/server/services/embeddings";
import { getVectorStoreService } from "~~/server/services/vectorStore";

/**
 * 知识摄取流水线
 * 
 * 负责将文档转换为可检索的向量数据，核心流程：
 * 1. 解析（parsing）：从数据源加载原始文档
 * 2. 分块（chunking）：将长文档切分为小块，便于检索
 * 3. 嵌入（embedding）：将文本转换为向量表示
 * 4. 索引（indexing）：将向量存入向量数据库
 */
export class KnowledgeIngestionPipeline {
  /**
   * 执行文档摄取流程
   * 
   * @param source - 数据源（GitHub/PDF/Word）
   * @param onStage - 阶段回调函数，用于推送进度事件
   * @returns 摄取结果，包含原始文档和分块数据
   */
  async ingest(
    source: IDataSource,
    onStage?: (stage: "parsing" | "chunking" | "embedding" | "indexing", progress: number) => void,
  ) {
    // 阶段 1: 解析 - 从数据源加载原始文档
    onStage?.("parsing", 20);
    const documents = await source.load();

    // 阶段 2: 分块 - 将长文档切分为小块，便于检索
    // 每个块包含文本内容和元数据（文档ID、来源等）
    onStage?.("chunking", 45);
    const chunks = await chunkDocuments(documents);

    // 阶段 3: 嵌入 - 将文本转换为向量表示
    // 使用 LLM 的 embedding 模型将文本转换为高维向量
    onStage?.("embedding", 70);
    const embeddings = createEmbeddings();
    const vectors = await embeddings.embedDocuments(chunks.map((item) => item.content));

    // 阶段 4: 索引 - 将向量存入向量数据库
    // upsert 操作：如果已存在则更新，否则插入
    onStage?.("indexing", 90);
    const vectorStore = await getVectorStoreService();
    await vectorStore.upsertChunks(chunks, vectors);

    onStage?.("indexing", 100);
    return { documents, chunks };
  }
}
