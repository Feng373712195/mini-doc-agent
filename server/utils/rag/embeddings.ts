import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { useRuntimeConfig } from "#imports";

function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

class OpenAICompatEmbeddings implements EmbeddingsInterface {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly dimensions?: number;

  constructor(options: { apiKey: string; model: string; baseUrl: string; dimensions?: number }) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = options.baseUrl;
    this.dimensions = options.dimensions;
  }

  async embedQuery(text: string): Promise<number[]> {
    const vectors = await this.embedDocuments([text]);
    if (!vectors[0]) throw new Error("Embeddings returned empty result");
    return vectors[0];
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const batches = chunkArray(texts, 64);
    const allVectors: number[][] = [];

    for (const batch of batches) {
      const payload: Record<string, unknown> = { model: this.model, input: batch };
      if (this.dimensions) payload.dimensions = this.dimensions;

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embeddings request failed: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[]; index: number }>;
      };

      const batchVectors = new Array(batch.length);
      for (const item of data.data) batchVectors[item.index] = item.embedding;
      allVectors.push(...(batchVectors as number[][]));
    }

    return allVectors;
  }
}

export function createEmbeddings(): EmbeddingsInterface {
  const config = useRuntimeConfig();
  if (!config.embeddingApiKey) throw new Error("Missing EMBEDDING_API_KEY");
  return new OpenAICompatEmbeddings({
    apiKey: String(config.embeddingApiKey),
    model: String(config.embeddingModel),
    baseUrl: String(config.embeddingBaseUrl),
    dimensions: config.embeddingDimensions ? Number(config.embeddingDimensions) : undefined,
  });
}
