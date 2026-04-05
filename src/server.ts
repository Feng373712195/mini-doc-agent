// 引入入口级初始化逻辑（代理等）。
import "./bootstrap.js";
// 引入 Express 框架。
import express from "express";
// 引入 Node.js path 工具。
import path from "node:path";
// 引入 zod 用于请求参数校验。
import { z } from "zod";
// 引入问答函数。
import { askQuestion } from "./query.js";

// 创建 Express 应用实例。
const app = express();
// 读取端口配置，默认使用 3000。
const port = Number(process.env.PORT || 3000);
// 计算静态资源目录绝对路径。
const publicDir = path.resolve("public");

// 启用 JSON 请求体解析中间件。
app.use(express.json());
// 挂载静态资源目录，用于访问 public/index.html。
app.use(express.static(publicDir));

// 定义 /chat 接口请求体校验规则。
const ChatBody = z.object({
  // query 必须是至少 1 个字符的字符串。
  query: z.string().min(1, "query 不能为空"),
});

// 定义聊天接口。
app.post("/chat", async (req, res) => {
  // 校验请求体格式是否符合约定。
  const parsed = ChatBody.safeParse(req.body);
  // 参数校验失败时返回 400。
  if (!parsed.success) {
    // 返回具体错误提示给前端。
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "参数错误" });
  }

  // 捕获问答阶段可能抛出的异常。
  try {
    // 调用问答函数得到回答。
    const result = await askQuestion(parsed.data.query);
    // 成功时返回回答内容。
    return res.json(result);
  // 处理运行时错误。
  } catch (error) {
    // 返回 500 与错误信息。
    return res.status(500).json({
      // 优先返回 Error.message，兜底通用文案。
      error: error instanceof Error ? error.message : "服务内部错误",
    });
  }
});

// 启动 HTTP 服务。
app.listen(port, () => {
  // 打印服务访问地址。
  console.log(`doc-agent 服务已启动: http://localhost:${port}`);
});
