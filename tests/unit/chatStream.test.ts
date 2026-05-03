import { describe, expect, it, beforeEach } from "vitest";
import { streamChatText } from "../../server/services/chat";

describe("streamChatText (mock)", () => {
  beforeEach(() => {
    process.env.CHAT_MOCK = "1";
  });

  it("yields multiple deltas", async () => {
    const parts: string[] = [];
    for await (const d of streamChatText("hello")) parts.push(d);
    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(parts.join("")).toContain("useEffect");
  });
});
