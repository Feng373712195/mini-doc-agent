import { loadOrCreateVectorStore } from "../services/vectorStore";

/**
 * 检索相关文档片段
 * 基于用户查询，从向量存储中检索最相关的 k 个文档片段
 * @param query - 用户查询文本
 * @param k - 返回的文档片段数量，默认 3
 * @returns 包含格式化上下文和原始匹配结果
 */
export async function retrieveContexts(query: string, k = 3) {
  // Mock 模式：返回预设的测试数据
  if (process.env.USE_MOCK_RAG === "1") {
    const matches = [
      {
        content:
          "useEffect 用来在函数组件中处理副作用。常见场景包括订阅事件、请求数据、操作 DOM。",
        metadata: { source: "mock/react.md" },
      },
      {
        content: "默认情况下，useEffect 会在每次渲染后执行；依赖数组可控制执行时机。",
        metadata: { source: "mock/react.md" },
      },
      {
        content: "如果上下文不足，请明确说文档中没有足够信息。",
        metadata: { source: "mock/rules.md" },
      },
    ].slice(0, k);
    const context = matches
      .map((doc, i) => `【片段${i + 1}】\n${doc.content}`)
      .join("\n\n");
    return { context, matches };
  }

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
