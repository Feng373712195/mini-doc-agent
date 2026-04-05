// 引入入口级初始化逻辑（代理等）。
import "./bootstrap.js";
// 引入兼容 OpenAI 格式的对话模型封装。
import { ChatOpenAI } from "@langchain/openai";
// 引入加载或创建向量库方法。
import { loadOrCreateVectorStore } from "./rag.js";

// 读取聊天模型 API Key 配置。
const CHAT_API_KEY = process.env.CHAT_API_KEY;
// 读取聊天模型名称配置（示例默认值为 glm-4.7-flash）。
const CHAT_MODEL = process.env.CHAT_MODEL || "glm-4.7-flash";
// 读取聊天 API Base URL 配置（示例默认值为智谱根地址）。
const CHAT_BASE_URL =
  process.env.CHAT_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";

// 规范化聊天 Base URL，避免重复拼接 /chat/completions。
function normalizeChatBaseUrl(url: string): string {
  // 去除末尾斜杠，便于判断。
  const trimmed = url.replace(/\/+$/, "");
  // 如果用户传的是完整端点，则裁掉尾部路径。
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed.replace(/\/chat\/completions$/, "");
  }
  // 其他情况直接返回。
  return trimmed;
}

// 规范化模型返回内容为字符串，便于前端展示。
function normalizeContent(content: unknown): string {
  // 如果本身是字符串，直接返回。
  if (typeof content === "string") return content;
  // 如果是数组（多段内容），拼接成字符串。
  if (Array.isArray(content)) {
    // 对数组项做逐个序列化处理后换行拼接。
    return content
      // 字符串直接保留，其他类型转 JSON 字符串。
      .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
      // 用换行连接多个片段。
      .join("\n");
  }
  // 兜底把任意对象序列化为字符串。
  return JSON.stringify(content);
}

// 核心问答函数：检索 top3 + 拼接上下文 + 调用大模型回答。
export async function askQuestion(query: string) {
  // 校验聊天 API Key 是否存在。
  if (!CHAT_API_KEY) {
    // 提示用户补充聊天模型 Key 配置。
    throw new Error("请在 .env 中设置 CHAT_API_KEY");
  }
  // 加载已有索引或即时构建索引。
  const vectorStore = await loadOrCreateVectorStore();
  // 从向量库创建检索器，并限制返回 3 条。
  const retriever = (vectorStore as any).asRetriever(3);
  // 执行语义检索拿到最相关文档块。
  const matches = await retriever.invoke(query);

  // 把检索片段拼成上下文字符串。
  const context = matches
    // 给每段内容加编号，方便观察命中来源。
    .map((doc: any, i: number) => `【片段${i + 1}】\n${doc.pageContent}`)
    // 用空行分隔多个片段。
    .join("\n\n");

  // 构造提示词，要求基于上下文回答。
  const prompt = `你是一个文档问答助手。请严格根据提供的上下文回答。\n如果上下文不足，请明确说“文档中没有足够信息”。\n\n问题：${query}\n\n上下文：\n${context}`;

  // 创建聊天模型实例，固定温度为 0。
  const model = new ChatOpenAI({
    // 设置模型名称。
    model: CHAT_MODEL,
    // 设置温度为 0。
    temperature: 0,
    // 设置聊天 API Key。
    apiKey: CHAT_API_KEY,
    // 设置聊天 Base URL。
    configuration: { baseURL: normalizeChatBaseUrl(CHAT_BASE_URL) },
  });
  // 发送 prompt 获取模型响应。
  const result = await (model as any).invoke(prompt);

  // 返回答案和命中上下文，便于调试与展示。
  return {
    // 将模型响应内容转为可展示字符串。
    answer: normalizeContent(result.content),
    // 返回检索命中项的内容和元数据。
    contexts: matches.map((doc: any) => ({
      // 命中文本内容。
      content: doc.pageContent,
      // 命中来源元数据。
      metadata: doc.metadata,
    })),
  };
}

// 命令行测试入口函数。
async function cli() {
  // 读取命令行问题；若为空则使用默认示例问题。
  const question = process.argv.slice(2).join(" ") || "React 中 useEffect 有什么作用？";
  // 调用问答函数获得结果。
  const result = await askQuestion(question);

  // 打印输入问题。
  console.log("问题:", question);
  // 打印模型回答。
  console.log("\n回答:\n", result.answer);
  // 打印命中片段标题。
  console.log("\n命中片段:");
  // 逐条打印命中片段摘要。
  result.contexts.forEach((item: any, index: number) => {
    // 打印序号与来源文件路径。
    console.log(`\n[${index + 1}]`, item.metadata?.source || "unknown");
    // 打印片段前 200 字符作为预览。
    console.log(item.content.slice(0, 200).replace(/\s+/g, " ") + "...");
  });
}

// 判断当前文件是否以 CLI 方式直接运行。
if (process.argv[1] && process.argv[1].includes("query.ts")) {
  // 运行 CLI 并捕获异常。
  cli().catch((error) => {
    // 打印 CLI 执行错误。
    console.error("query 执行失败:", error);
    // 异常退出进程。
    process.exit(1);
  });
}
