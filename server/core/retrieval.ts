import { loadOrCreateVectorStore } from "../services/vectorStore";

export async function retrieveContexts(query: string, k = 3) {
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

  const store = await loadOrCreateVectorStore();
  const retriever = (store as any).asRetriever(k);
  const matches = await retriever.invoke(query);
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
