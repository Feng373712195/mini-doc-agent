/**
 * 检索服务工厂
 * 根据环境变量动态选择 Mock 或真实实现
 */

type RetrievalService = {
  retrieveContexts: (query: string, k?: number) => Promise<{
    context: string;
    matches: Array<{ content: string; metadata: any }>;
  }>;
};

/**
 * 获取检索服务实例
 * 根据 USE_MOCK_RAG 环境变量决定使用 Mock 还是真实实现
 */
export async function getRetrievalService(): Promise<RetrievalService> {
  if (process.env.USE_MOCK_RAG === "1") {
    return await import("./retrieval.mock");
  }
  return await import("./retrieval");
}
