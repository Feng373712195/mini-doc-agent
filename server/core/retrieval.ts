import { loadOrCreateVectorStore } from "../services/vectorStore";

/**
 * 检索相关文档片段
 * 基于用户查询，从向量存储中检索最相关的 k 个文档片段
 * @param query - 用户查询文本
 * @param k - 返回的文档片段数量，默认 3
 * @returns 包含格式化上下文和原始匹配结果
 */
export async function retrieveContexts(query: string, k = 3) {
  // 从向量存储中检索相关文档
  const store = await loadOrCreateVectorStore();
  const retriever = (store as any).asRetriever(k);
  const matches = await retriever.invoke(query);
  
  // 格式化上下文：将多个片段拼接成带编号的文本
  const context = matches
    .map((doc: any, i: number) => `【片段${i + 1}】\n${doc.pageContent}`)
    .join("\n\n");
  return {
    context,
    matches: matches.map((doc: any) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
    })),
  };
}
