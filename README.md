# RepoMind (Nuxt Fullstack)

一个可开箱即用的 Nuxt 全栈文档问答系统 示例项目，包含：
- 文档读取与切分（`docs/*.md`）
- 基于 `HNSWLib` 的向量检索（本地 `vector-store/`）
- 通过 OpenAI 兼容接口的聊天模型问答
- 类 ChatGPT/Gemini 的对话 UI（SSE 流式输出 + 虚拟列表 + 自动贴底）
- SQLite 会话/消息持久化（默认 `data/chat.db`）

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

创建 `.env`，并填写聊天与嵌入配置（示例为智谱）：

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

## 4. 准备文档

把你的 Markdown 文档放到 `docs/` 目录（例如 React/Vue 文档）。

## 5. 数据预处理（切分 + 建索引）

```bash
npm run ingest
```

执行结果：
- 控制台打印切分后的 JSON
- 向量索引保存到 `vector-store/`

## 6. 启动开发服务

```bash
npm run dev
```

打开浏览器：
- http://localhost:3000

## 7. 测试

```bash
# 单元 / 集成测试（mock 模式，不请求真实模型）
CHAT_MOCK=1 USE_MOCK_RAG=1 npm run test:unit

# E2E（mock 模式）
CHAT_MOCK=1 USE_MOCK_RAG=1 npm run test:e2e
```

## 8. 项目结构

```text
doc-agent/
├─ app/                              # 前端应用目录（UI 收敛）
│  ├─ pages/
│  ├─ layouts/
│  ├─ middleware/
│  ├─ components/
│  ├─ composables/
│  ├─ plugins/
│  ├─ assets/
│  ├─ app.vue
│  └─ error.vue                      #（可选）
│
├─ public/
│
├─ server/                            # 服务端（Nitro）
│  ├─ api/                            # HTTP 端点层
│  ├─ core/                           # 核心业务层（数据访问、业务逻辑）
│  ├─ services/                       # 外部服务封装（LLM、向量存储等）
│  └─ utils/                          # 纯工具函数（可选）
│
├─ shared/                            # 前后端共享（纯类型/协议/无运行时依赖）
│  ├─ types/
│  ├─ schemas/
│  ├─ constants/
│  └─ utils/
│
├─ tests/                             # 测试统一入口（推荐保留）
│  ├─ e2e/                            # 端到端测试（Playwright）
│  │  ├─ specs/                       # 测试用例（*.spec.ts）
│  │  ├─ fixtures/                    # e2e 固定数据、mock 文件
│  │  └─ utils/                       # e2e 专用工具（登录、API helper）
│  ├─ unit/                           # 纯函数/组件逻辑单测（如 vitest）
│  └─ integration/                    # server/service 集成测试
│
├─ playwright.config.ts               # Playwright 配置
│
├─ scripts/
├─ docs/
├─ rules/
│
├─ nuxt.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
├─ eslint.config.*
└─ .env
```

