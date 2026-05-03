import { mockChatResponseParts, mockStreamDelay } from "~~/mocks/chat.mock";

/**
 * Mock 实现：流式调用 LLM 生成文本
 * 用于测试和开发环境，返回预设的测试数据
 * @param prompt - 用户提示词（mock 模式下不使用）
 * @returns 异步生成器，逐步返回生成的文本片段
 */
export async function* streamChatText(prompt: string): AsyncGenerator<string> {
  for (const part of mockChatResponseParts) {
    await new Promise((resolve) => setTimeout(resolve, mockStreamDelay));
    yield part;
  }
}
