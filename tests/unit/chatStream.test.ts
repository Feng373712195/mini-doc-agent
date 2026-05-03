import { describe, expect, it, beforeEach } from "vitest";
import { getChatService } from "../../server/services/chat.factory";

describe("streamChatText (mock)", () => {
  beforeEach(() => {
    process.env.CHAT_MOCK = "1";
  });

  it("yields multiple deltas", async () => {
    const chatService = await getChatService();
    const parts: string[] = [];
    for await (const d of chatService.streamChatText("hello")) parts.push(d);
    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(parts.join("")).toContain("useEffect");
  });
});
