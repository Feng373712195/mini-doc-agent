# AI_STATE.md

> 目的：记录本项目在"当前时刻"的真实状态，便于 Code Review、协作与后续迭代。

## 版本

- 当前项目版本：v1.0
- 代码分支：`main`

## 当前架构

- 应用类型：Nuxt 全栈（前端 SSR/CSR + Nitro Server Routes）
- 前端目录：`app/`（通过 `nuxt.config.ts` 的 `srcDir: "app/"`）
- 服务端目录：仓库根目录 `server/`（通过 `nuxt.config.ts` 的 `serverDir: "server"`）
- 数据持久化：SQLite（本地文件，默认在 `data/` 下）
- RAG：
  - 文档源：`docs/` 下 Markdown
  - 切分：`scripts/ingest.ts`（基于 LangChain split）
  - 向量库：HNSWLib（本地索引目录 `vector-store/`）
  - 检索：topK=3 片段拼接到 prompt
- 流式：SSE（`EventSource` 订阅服务端 `/api/.../stream`）

## 当前模块状态

- 前端 UI（Chat 页面）
  - 状态：可运行，布局已修复为稳定的三段式 Flexbox 布局
  - 关键能力：会话列表、新建会话、消息展示、SSE 增量输出、自动滚动到底部
  - 历史消息分页：已接入（上滑接近顶部触发加载；每次 50 条；前插并补偿 scrollTop，尽量避免视口跳动）
  - 旧内容"暂时隐藏"策略：未实现（仅做了分页加载，并未对超过 50 轮/大量消息做自动隐藏与按需展开）
- Server API
  - 状态：可用（已修复 `/api/*` 404）
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
  - `npm run typecheck`：通过
  - `npm run test:e2e`：未作为本状态文件的硬性通过项（若后续启用，会在"下一步计划"列入）

## 最近变更（摘要）



## 已知问题

- 依赖/规范：
  - `AGENTS.md` 中约束包管理器为 pnpm，但当前项目脚本仍以 npm 为主（需要决定是否切换为 pnpm，并统一 README/脚本）
- 网络不稳定：
  - GitHub push 偶发 `Connection was reset`，目前通过重试可成功
- 分页/历史加载：
  - 后端已提供 `before` 翻页，但"对话超过 50 轮后旧内容暂时隐藏 + 滚动到旧对话再按页加载"的完整策略仍未落地（目前是用户上滑触发加载）

## 下一步计划（按优先级）

1. 继续完善"历史消息分页加载"
  - 目标：超过 50 轮后默认只渲染最新部分；用户上滑触顶自动加载更老消息
  - 行为细节（我会按这个实现）：
  - 初次进入会话：只拉最新 50 条
  - 滚动到顶部阈值（比如 scrollTop < 120）时触发 loadOlder()，每次追加到数组头部
  - 加载后保持当前视口位置不跳（计算加载前后 scrollHeight 差值补偿）
2. 结合 `content-visibility: auto` 做渲染优化评估与落地（以真实滚动性能为准）
3. 统一包管理器与工程化规范（pnpm / lint / format / build）
4. 补齐测试：增加分页/上拉加载与 SSE 流式的自动化测试（unit + e2e，mock 模式可稳定跑通）
