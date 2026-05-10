# RepoMind (Nuxt Fullstack)

一个基于 Nuxt 的文档问答系统，采用“接口上传 -> Ingestion Pipeline -> 向量检索 -> 对话回答”的流程。

## 主要能力

- 会话问答（SSE 流式返回）
- 文档上传入库（统一接口，支持 github/pdf/word）
- Ingestion 流水线（source -> chunk -> embedding -> index）
- SQLite 会话与文档元数据持久化
- Chroma 向量检索（支持基础 metadata 过滤）

## 环境要求

- Node.js 18+
- 可用的 Chat API（OpenAI 兼容）
- 可用的 Embedding API（OpenAI 兼容）
- Chroma 服务（默认 `http://localhost:8000`）

## 安装依赖

```bash
npm install
```

## 环境变量

创建 `.env`：

```env
CHAT_API_KEY=your_chat_api_key
CHAT_MODEL=glm-4.7-flash
CHAT_BASE_URL=https://open.bigmodel.cn/api/paas/v4

EMBEDDING_API_KEY=your_embedding_api_key
EMBEDDING_MODEL=embedding-3
EMBEDDING_BASE_URL=https://open.bigmodel.cn/api/paas/v4/embeddings
# EMBEDDING_DIMENSIONS=1024

# Chroma 服务地址
CHROMA_URL=http://localhost:8000
```

## 启动

```bash
npm run dev
```

## 测试

````bash
CHAT_MOCK=1 USE_MOCK_RAG=1 npm run test:unit
CHAT_MOCK=1 USE_MOCK_RAG=1 npm run test:e2e
```。
````
