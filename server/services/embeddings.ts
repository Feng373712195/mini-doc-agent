import type { EmbeddingsInterface } from "@langchain/core/embeddings";

/**
 * 将数组分块，用于批量处理
 * @param items - 待分块的数组
 * @param size - 每块的大小
 * @returns 分块后的二维数组
 */
function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

/**
 * OpenAI 兼容的 Embeddings 实现
 * 支持任何兼容 OpenAI Embeddings API 的服务（如智谱、通义等）
 */
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

    // 分批处理，避免单次请求过大（每批最多 64 条）
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

      // 按索引重新排序，确保顺序与输入一致
      const batchVectors = new Array(batch.length);
      for (const item of data.data) batchVectors[item.index] = item.embedding;
      allVectors.push(...(batchVectors as number[][]));
    }

    return allVectors;
  }
}

/**
 * 创建 Embeddings 实例
 * 从环境变量读取配置，支持 OpenAI 兼容的 API
 * @returns Embeddings 接口实例
 */
export function createEmbeddings(): EmbeddingsInterface {
  const embeddingApiKey = process.env.EMBEDDING_API_KEY;
  const embeddingModel = process.env.EMBEDDING_MODEL;
  const embeddingBaseUrl = process.env.EMBEDDING_BASE_URL;
  const embeddingDimensions = process.env.EMBEDDING_DIMENSIONS
    ? Number(process.env.EMBEDDING_DIMENSIONS)
    : undefined;

  if (!embeddingApiKey) throw new Error("Missing EMBEDDING_API_KEY");
  if (!embeddingModel) throw new Error("Missing EMBEDDING_MODEL");
  if (!embeddingBaseUrl) throw new Error("Missing EMBEDDING_BASE_URL");

  return new OpenAICompatEmbeddings({
    apiKey: String(embeddingApiKey),
    model: String(embeddingModel),
    baseUrl: String(embeddingBaseUrl),
    dimensions: embeddingDimensions,
  });
}
