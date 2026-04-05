# Doc Agent

一个最小可运行的文档问答 Agent 示例项目，包含：
- 文档读取与切分（`docs/*.md`）
- 基于 `HNSWLib` 的向量检索
- 通过 OpenAI 兼容接口的聊天模型问答
- 最简网页交互（`public/index.html`）

## 1. 环境要求

- Node.js 18+
- 模型服务 API Key（聊天 + 嵌入）
- 若要使用 `HNSWLib`，本机需可编译 `hnswlib-node`：
  - Python 3
  - C/C++ Build Tools（Windows 常见为 Visual Studio Build Tools）

## 2. 安装依赖

```bash
npm install
```

如果 `hnswlib-node` 没有安装成功，可在补齐 Python/构建工具后单独执行：

```bash
npm install hnswlib-node
```

## 3. 配置环境变量

复制 `.env.example` 为 `.env`，并填写聊天与嵌入配置（示例为智谱）：

```env
# 聊天模型配置（示例：智谱 GLM-4.7-Flash）
CHAT_API_KEY=your_chat_api_key_here
CHAT_MODEL=glm-4.7-flash
CHAT_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# 嵌入模型配置（示例：智谱 Embedding-3）
EMBEDDING_API_KEY=your_embedding_api_key_here
EMBEDDING_MODEL=embedding-3
EMBEDDING_BASE_URL=https://open.bigmodel.cn/api/paas/v4/embeddings
# 可选：输出向量维度（仅在模型支持时使用）
# EMBEDDING_DIMENSIONS=1024
```

如果你本机依赖代理访问外网（例如 `127.0.0.1:7890`），请在 `.env` 追加：

```env
HTTPS_PROXY=http://127.0.0.1:7890
HTTP_PROXY=http://127.0.0.1:7890
```

补充：项目已支持在 Windows 下自动读取系统代理（注册表 `ProxyEnable/ProxyServer`），未配置上述变量时会自动尝试使用系统代理。

## 4. 准备文档

将你的 Markdown 文档放到 `docs/` 目录（例如 React/Vue 文档）。

## 5. 数据预处理（切分 + 建索引）

```bash
npm run ingest
```

执行结果：
- 控制台打印切分后的 JSON
- 向量索引保存到 `vector-store/`

## 6. 命令行问答测试

```bash
npm run query -- "React 中 useEffect 有什么作用？"
```

## 7. 启动网页服务

```bash
npm run start
```

打开浏览器访问：

- http://localhost:3000

## 8. 项目结构

```text
doc-agent/
  docs/
  public/
    index.html
  src/
    ingest.ts
    query.ts
    rag.ts
    server.ts
    bootstrap.ts
    proxy.ts
  vector-store/
  .env.example
  README.md
  package.json
```
