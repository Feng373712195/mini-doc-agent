import { describe, expect, it, beforeEach } from "vitest";
import { getRetrievalService } from "../../server/core/retrieval.factory";

describe("retrieveContexts (mock)", () => {
  beforeEach(() => {
    process.env.USE_MOCK_RAG = "1";
  });

  it("returns context and matches", async () => {
    const retrievalService = await getRetrievalService();
    const out = await retrievalService.retrieveContexts("React useEffect", 3);
    expect(out.matches.length).toBe(3);
    expect(out.context).toContain("片段1");
    expect(out.context).toContain("useEffect");
  });
});
