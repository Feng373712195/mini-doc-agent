/**
 * 聊天服务工厂
 * 根据环境变量动态选择 Mock 或真实实现
 */

type ChatService = {
  streamChatText: (prompt: string) => AsyncGenerator<string>;
};

/**
 * 获取聊天服务实例
 * 根据 CHAT_MOCK 环境变量决定使用 Mock 还是真实实现
 */
export async function getChatService(): Promise<ChatService> {
  if (process.env.CHAT_MOCK === "1") {
    return await import("./chat.mock");
  }
  return await import("./chat");
}
