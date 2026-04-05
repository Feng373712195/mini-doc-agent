// 引入入口级初始化逻辑（代理等）。
import "./bootstrap.js";
// 引入 Node.js 的 path 工具，方便构造绝对路径。
import path from "node:path";
// 引入文件存在性判断方法。
import { existsSync } from "node:fs";
// 引入目录加载器，用于批量读取 docs 目录文件。
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
// 引入文本加载器，用于读取 .md 文本内容。
import { TextLoader } from "langchain/document_loaders/fs/text";
// 引入递归文本切分器，用于把长文档拆成小块。
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
// 引入向量接口类型定义。
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
// 引入文档类型定义，便于 TypeScript 类型检查。
import type { Document } from "langchain/document";

// 定义文档目录绝对路径。
const DOCS_DIR = path.resolve("docs");
// 定义向量索引目录绝对路径。
const VECTOR_DIR = path.resolve("vector-store");

// 读取嵌入模型 API Key。
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY;
// 读取嵌入模型名称。
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "embedding-3";
// 读取嵌入 API 地址（示例默认值为智谱接口）。
const EMBEDDING_BASE_URL =
  process.env.EMBEDDING_BASE_URL || "https://open.bigmodel.cn/api/paas/v4/embeddings";
// 读取可选的向量维度配置。
const EMBEDDING_DIMENSIONS = process.env.EMBEDDING_DIMENSIONS
  ? Number(process.env.EMBEDDING_DIMENSIONS)
  : undefined;

// 将数组分块，避免单次请求超过限制。
function chunkArray<T>(items: T[], size: number): T[][] {
  // 初始化分块结果数组。
  const result: T[][] = [];
  // 使用步进循环切分数组。
  for (let i = 0; i < items.length; i += size) {
    // 截取当前分块。
    result.push(items.slice(i, i + size));
  }
  // 返回分块后的数组。
  return result;
}

// 基于 OpenAI 兼容嵌入接口的自定义向量实现。
class OpenAICompatEmbeddings implements EmbeddingsInterface {
  // 保存 API Key。
  private readonly apiKey: string;
  // 保存模型名称。
  private readonly model: string;
  // 保存请求地址。
  private readonly baseUrl: string;
  // 保存维度设置。
  private readonly dimensions?: number;

  // 构造函数注入必要参数。
  constructor(options: { apiKey: string; model: string; baseUrl: string; dimensions?: number }) {
    // 记录 API Key。
    this.apiKey = options.apiKey;
    // 记录模型名称。
    this.model = options.model;
    // 记录请求地址。
    this.baseUrl = options.baseUrl;
    // 记录可选维度。
    this.dimensions = options.dimensions;
  }

  // 把单条文本转换成向量。
  async embedQuery(text: string): Promise<number[]> {
    // 复用批量接口，只传入一条文本。
    const vectors = await this.embedDocuments([text]);
    // 返回第一条向量结果。
    return vectors[0];
  }

  // 把多条文本转换成向量。
  async embedDocuments(texts: string[]): Promise<number[][]> {
    // 如果没有文本，直接返回空数组。
    if (texts.length === 0) return [];
    // 每次请求最多 64 条，按文档说明进行分块。
    const batches = chunkArray(texts, 64);
    // 用于汇总全部向量结果。
    const allVectors: number[][] = [];

    // 逐批请求，避免超限。
    for (const batch of batches) {
      // 构造请求体。
      const payload: Record<string, unknown> = {
        model: this.model,
        input: batch,
      };
      // 如果指定了维度则加入参数。
      if (this.dimensions) payload.dimensions = this.dimensions;

      // 发起请求调用嵌入接口。
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // 如果请求失败，抛出详细错误。
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`嵌入请求失败: ${response.status} ${errorText}`);
      }

      // 解析返回 JSON。
      const data = (await response.json()) as {
        data: Array<{ embedding: number[]; index: number }>;
      };

      // 初始化批次向量数组。
      const batchVectors = new Array(batch.length);
      // 根据 index 填充向量，保证顺序一致。
      for (const item of data.data) {
        batchVectors[item.index] = item.embedding;
      }
      // 追加到总结果数组。
      allVectors.push(...(batchVectors as number[][]));
    }

    // 返回所有向量结果。
    return allVectors;
  }
}

// 动态加载 HNSWLib，避免在缺少原生依赖时程序直接崩溃。
async function getHNSWLib() {
  // 使用 try/catch 捕获模块加载失败。
  try {
    // 动态导入 HNSWLib 向量库实现。
    const mod = await import("@langchain/community/vectorstores/hnswlib");
    // 返回 HNSWLib 类供后续创建向量库。
    return mod.HNSWLib;
  // 处理加载失败场景。
  } catch {
    // 抛出更友好的错误提示信息。
    throw new Error(
      // 提示用户安装 hnswlib-node 所需依赖。
      "无法加载 HNSWLib。请先安装 Python 3 与构建工具后执行: npm install hnswlib-node"
    );
  }
}

// 读取并切分 docs 下的 Markdown 文档。
export async function loadAndSplitDocs(): Promise<Document[]> {
  // 创建目录加载器，并声明只处理 .md 文件。
  const loader = new DirectoryLoader(DOCS_DIR, {
    // 指定 .md 文件使用 TextLoader 读取。
    ".md": (filePath) => new TextLoader(filePath),
  });

  // 载入 docs 目录中的全部 .md 文档。
  const docs = await loader.load();
  // 如果一个文档都没有，抛出错误阻止后续流程。
  if (docs.length === 0) {
    // 错误信息中带上文档目录路径，便于排查。
    throw new Error(`在 ${DOCS_DIR} 没有找到 .md 文档。`);
  }

  // 创建文本切分器，块大小约 500 字符。
  const splitter = new RecursiveCharacterTextSplitter({
    // 设置每个分块的最大字符数。
    chunkSize: 500,
    // 设置分块重叠字符数，减少上下文断裂。
    chunkOverlap: 100,
  });

  // 执行文档切分并返回切分后的文档数组。
  return splitter.splitDocuments(docs);
}

// 创建嵌入实例（带校验）。
function createEmbeddings(): EmbeddingsInterface {
  // 校验 API Key 是否配置。
  if (!EMBEDDING_API_KEY) {
    throw new Error("请在 .env 中设置 EMBEDDING_API_KEY");
  }
  // 返回嵌入实例。
  return new OpenAICompatEmbeddings({
    apiKey: EMBEDDING_API_KEY,
    model: EMBEDDING_MODEL,
    baseUrl: EMBEDDING_BASE_URL,
    dimensions: EMBEDDING_DIMENSIONS,
  });
}

// 根据切分结果创建 HNSWLib 向量库并保存到本地。
export async function buildVectorStore(chunks: Document[]) {
  // 获取 HNSWLib 类定义。
  const HNSWLib = await getHNSWLib();
  // 创建嵌入实例。
  const embeddings = createEmbeddings();
  // 用切分后的文档创建向量库。
  const vectorStore = await HNSWLib.fromDocuments(chunks, embeddings);
  // 将向量库保存到 vector-store 目录。
  await vectorStore.save(VECTOR_DIR);
  // 返回创建好的向量库实例。
  return vectorStore;
}

// 尝试加载已存在的向量库，不存在则自动重建。
export async function loadOrCreateVectorStore() {
  // 获取 HNSWLib 类定义。
  const HNSWLib = await getHNSWLib();
  // 创建嵌入实例。
  const embeddings = createEmbeddings();

  // 如果检测到 args.json，说明索引目录已经存在。
  if (existsSync(path.join(VECTOR_DIR, "args.json"))) {
    // 直接从本地目录加载向量库。
    return HNSWLib.load(VECTOR_DIR, embeddings);
  }

  // 若本地没有索引，则重新读取并切分文档。
  const chunks = await loadAndSplitDocs();
  // 用切分结果构建并返回新向量库。
  return buildVectorStore(chunks);
}
