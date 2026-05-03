# AI_STATE.md

> 目的：记录本项目在"当前时刻"的真实状态，便于 Code Review、协作与后续迭代。

## 版本

- 当前项目版本：v1.0
- 代码分支：`main`

## 当前架构

- 应用类型：Nuxt 全栈（前端 SSR/CSR + Nitro Server Routes）
- 前端目录：`app/`（通过 `nuxt.config.ts` 的 `srcDir: "app/"`）
- 服务端目录：仓库根目录 `server/`（通过 `nuxt.config.ts` 的 `serverDir: "server"`）
  - `server/api/`：HTTP 端点层
  - `server/core/`：核心业务层（数据访问、RAG 检索逻辑）
  - `server/services/`：外部服务封装（LLM、Embedding、向量存储）
- 数据持久化：SQLite（本地文件，默认在 `data/` 下）
- RAG：
  - 文档源：`docs/` 下 Markdown
  - 切分：`scripts/ingest.ts`（基于 LangChain split）
  - 向量库：HNSWLib（本地索引目录 `vector-store/`）
  - 检索：topK=3 片段拼接到 prompt
- 流式：SSE（`EventSource` 订阅服务端 `/api/.../stream`）

## 当前模块状态

- 前端 UI（Chat 页面）
  - 状态：✅ 已修复，布局正常
  - 关键能力：会话列表、新建会话、消息展示、SSE 增量输出、自动滚动到底部
  - 历史消息分页：已接入（上滑接近顶部触发加载；每次 50 条；前插并补偿 scrollTop，尽量避免视口跳动）
  - 样式系统：完全符合 rules/style.md 规范
    - 使用 Less 预处理器
    - 所有样式使用 Less 变量（@primary-navy, @space-md 等）
    - 使用 scoped 样式和 Less 嵌套
    - 复用 app.less 全局样式
- Server API
  - 状态：可用
  - 已实现接口：
    - `GET /api/conversations`
    - `POST /api/conversations`
    - `GET /api/conversations/:id/messages?limit=50&before=...`
    - `POST /api/conversations/:id/messages`
    - `GET /api/conversations/:id/stream?assistantMessageId=...`（SSE）
- SQLite
  - 状态：可用（用于 conversations/messages）
- Ingest / 索引生成
  - 状态：可用（`npm run ingest` 生成/更新 `vector-store/`）
- 测试
  - `npm run test:unit`：通过
  - `npm run build`：通过
  - `npm run typecheck`：通过（已补齐 tsconfig paths，支持 `~~/server/*`）

### 历史变更
- Server 目录重构：将 server 层按职责重新组织为 core（核心业务）、services（外部服务）、utils（工具函数）三层架构
  - `utils/db.ts` → `core/database.ts`（数据访问层）
  - `utils/rag/retrieve.ts` → `core/retrieval.ts`（RAG 检索业务逻辑）
  - `utils/llm/chat.ts` → `services/chat.ts`（LLM 服务封装）
  - `utils/rag/embeddings.ts` → `services/embeddings.ts`（Embedding 服务封装）
  - `utils/rag/vectorStore.ts` → `services/vectorStore.ts`（向量存储服务封装）
  - 同步更新测试文件导入路径（`tests/unit/chatStream.test.ts`、`tests/unit/retrieve.test.ts`）
  - 验证通过：单元测试全部通过（2/2 passed）

## 已知问题

- 依赖/规范：
  - `AGENTS.md` 中约束包管理器为 pnpm，但当前项目脚本仍以 npm 为主（需要决定是否切换为 pnpm，并统一 README/脚本）
- 网络不稳定：
  - GitHub push 偶发 `Connection was reset`，目前通过重试可成功

## 下一步计划（按优先级）

1. 测试界面功能
   - 启动开发服务器验证界面正常显示
   - 测试会话列表、新建会话、消息发送、流式输出等功能
   - 测试历史消息分页加载
   - 测试 Sidebar 折叠/展开
2. 继续完善"历史消息分页加载"
   - 目标：超过 50 轮后默认只渲染最新部分；用户上滑触顶自动加载更老消息
   - 行为细节：
     - 初次进入会话：只拉最新 50 条
     - 滚动到顶部阈值（比如 scrollTop < 120）时触发 loadOlder()，每次追加到数组头部
     - 加载后保持当前视口位置不跳（计算加载前后 scrollHeight 差值补偿）
3. 结合 `content-visibility: auto` 做渲染优化评估与落地（以真实滚动性能为准）
4. 统一包管理器与工程化规范（pnpm / lint / format / build）
5. 补齐测试：增加分页/上拉加载与 SSE 流式的自动化测试（unit + e2e，mock 模式可稳定跑通）
