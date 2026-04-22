import { ChatOpenAI } from "@langchain/openai";
import { useRuntimeConfig } from "#imports";

function normalizeChatBaseUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed.replace(/\/chat\/completions$/, "");
  return trimmed;
}

export async function* streamChatText(prompt: string): AsyncGenerator<string> {
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

  const config = useRuntimeConfig();
  if (!config.chatApiKey) throw new Error("Missing CHAT_API_KEY");

  const model = new ChatOpenAI({
    model: String(config.chatModel),
    temperature: 0,
    apiKey: String(config.chatApiKey),
    configuration: { baseURL: normalizeChatBaseUrl(String(config.chatBaseUrl)) },
  });

  // LangChain streaming yields message chunks; we coerce to incremental text.
  const stream = await (model as any).stream(prompt);
  for await (const chunk of stream as AsyncIterable<any>) {
    const text = typeof chunk?.content === "string" ? chunk.content : "";
    if (text) yield text;
  }
}
