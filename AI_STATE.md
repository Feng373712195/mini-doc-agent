# AI_STATE.md

> 目的：记录本项目在“当前时刻”的真实状态，便于 Code Review、协作与后续迭代。

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
  - 状态：可运行，但仍存在 UI 细节问题需要继续优化（见“已知问题”）
  - 关键能力：会话列表、新建会话、消息展示、SSE 增量输出、自动滚动到底部、历史分页加载（上滑触发）
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
  - `npm run test:e2e`：未作为本状态文件的硬性通过项（若后续启用，会在“下一步计划”列入）

## 最近变更（摘要）

- 结构调整：将前端代码迁移到 `app/` 目录，并通过 `srcDir` 启用（保持 `server/` 在仓库根目录）
- 修复构建问题：修复了组件内重复 `defineExpose()` 导致的构建失败与 dev 500（IPC closed）
- 修复类型检查：在 server routes 中使用 `~~/` 根别名，避免 `srcDir` 变更后 TS 路径解析失败
- 修复 API 路由：修复 `serverDir` 配置，解决 `/api/conversations` 404

## 已知问题

- UI 细节：
  - 左侧标题区域的视觉（文字与背景遮挡、logo/副标题是否需要移除）仍需要按最新设计要求调整
  - 聊天区高度与输入框可见性在部分情况下可能异常（可能与水合/组件注册相关）
- 浏览器控制台：
  - 可能出现 `Failed to resolve component: a-input-text-area`（需继续排查 Ant Design Vue 组件注册/按需引入与 SSR 水合一致性）
- 依赖/规范：
  - `AGENTS.md` 中约束包管理器为 pnpm，但当前项目脚本仍以 npm 为主（需要决定是否切换为 pnpm，并统一 README/脚本）
- 网络不稳定：
  - GitHub push 偶发 `Connection was reset`，目前通过重试可成功

## 下一步计划（按优先级）

1. 修复前端 `a-input-text-area` 解析失败与水合错误，确保输入框稳定可见且无控制台报错
2. 修复布局高度问题：实现 ChatGPT 风格的三段式布局（header / 可滚动消息区 / 固定底部输入区）
3. UI 简化：移除无意义 logo、移除副标题，调整配色与留白，整体风格向 ChatGPT 靠拢
4. 继续完善“历史消息分页加载”体验与性能优化（结合 `content-visibility: auto` 的真实收益评估）
5. 统一包管理器与工程化规范（pnpm / lint / format / build）
6. 若需要：补齐 e2e 测试（Playwright）并加入 mock 模式稳定跑通

