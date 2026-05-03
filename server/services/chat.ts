import { ChatOpenAI } from "@langchain/openai";

/**
 * 标准化 Chat API 的 Base URL
 * 移除尾部斜杠和 /chat/completions 后缀，确保 URL 格式统一
 */
function normalizeChatBaseUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed.replace(/\/chat\/completions$/, "");
  return trimmed;
}

/**
 * 流式调用 LLM 生成文本
 * @param prompt - 用户提示词
 * @returns 异步生成器，逐步返回生成的文本片段
 */
export async function* streamChatText(prompt: string): AsyncGenerator<string> {
  // Mock 模式：返回预设的测试数据
  if (process.env.CHAT_MOCK === "1") {
    const parts = [
      "useEffect 用于在函数组件中处理副作用。",
      " 常见场景包括：订阅事件、请求数据、操作 DOM。",
      " 默认每次渲染后执行，可用依赖数组控制时机。",
    ];
    for (const p of parts) {
      await new Promise((r) => setTimeout(r, 200));
      yield p;
    }
    return;
  }

  const chatApiKey = process.env.CHAT_API_KEY;
  const chatModel = process.env.CHAT_MODEL;
  const chatBaseUrl = process.env.CHAT_BASE_URL;
  if (!chatApiKey) throw new Error("Missing CHAT_API_KEY");
  if (!chatModel) throw new Error("Missing CHAT_MODEL");
  if (!chatBaseUrl) throw new Error("Missing CHAT_BASE_URL");

  // 初始化 OpenAI 兼容的 LLM 客户端
  const model = new ChatOpenAI({
    model: String(chatModel),
    temperature: 0,
    apiKey: String(chatApiKey),
    configuration: { baseURL: normalizeChatBaseUrl(String(chatBaseUrl)) },
  });

  // 流式调用 LLM，逐步返回生成的文本片段
  const stream = await (model as any).stream(prompt);
  for await (const chunk of stream as AsyncIterable<any>) {
    const text = typeof chunk?.content === "string" ? chunk.content : "";
    if (text) yield text;
  }
}
