import { mockRetrievalDocuments } from "~~/mocks/retrieval.mock";

/**
 * Mock 实现：检索相关文档片段
 * 用于测试和开发环境，返回预设的测试数据
 * @param query - 用户查询文本（mock 模式下不使用）
 * @param k - 返回的文档片段数量，默认 3
 * @returns 包含格式化上下文和原始匹配结果
 */
export async function retrieveContexts(query: string, k = 3) {
  const matches = mockRetrievalDocuments.slice(0, k);
  const context = matches
    .map((doc, i) => `【片段${i + 1}】\n${doc.content}`)
    .join("\n\n");
  return { context, matches };
}
