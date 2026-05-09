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

- **文档管理弹窗功能开发**（2026-05-09）：
  - 创建 DocsModal 主弹窗组件，包含三个视图切换
  - ListView：文档列表表格（带分页）
  - UploadTypesView：上传方式选择（Github、PDF、Word，正方形按钮+Antd图标）
  - UploadView：具体上传界面（输入框+校验，Antd Upload组件）
  - 在 index.vue 中集成，绑定「查看文档」按钮
  - 弹窗尺寸：宽度600px，高度500px，切换视图时保持高度不变
  - 问题：@ant-design/icons-vue 导入触发 IPC connection closed 错误，已在 nuxt.config.ts 配置 vite.optimizeDeps.include，但问题仍存在
- **MessageBubble isLoading 状态管理**（2026-05-07）：为 Message 添加 isLoading 字段，通过 SSE 事件管理每条消息的 loading 状态，支持多消息并发场景下各自独立显示 spin
- **历史消息分页加载完善**（2026-05-07）：在 MessageList 组件顶部添加加载更早消息时的 loading 指示器，提升用户交互反馈
- **Prompt 抽离重构**（2026-05-03）：按照 `/rules/ai-design.md` 规范，将硬编码的 prompt 字符串抽离到独立文件
- Mock 与正式逻辑解耦重构：严格按照 `/rules/code-writing.md` 规范，将 mock 数据和服务从正式逻辑中分离
- Server 目录重构：将 server 层按职责重新组织为 core（核心业务）、services（外部服务）、utils（工具函数）三层架构

## 已知问题

- 依赖/规范：
  - `AGENTS.md` 中约束包管理器为 pnpm，但当前项目脚本仍以 npm 为主（需要决定是否切换为 pnpm，并统一 README/脚本）
- 网络不稳定：
  - GitHub push 偶发 `Connection was reset`，目前通过重试可成功
- @ant-design/icons-vue 导入问题：
  - 在 Nuxt 3 中导入 @ant-design/icons-vue 触发 IPC connection closed 错误
  - 已尝试在 nuxt.config.ts 配置 vite.optimizeDeps.include，但问题仍存在
  - 可能需要后续进一步排查或改用其他图标方案

## 下一步计划（按优先级）

1. 统一包管理器与工程化规范（pnpm / lint / format / build）
2. 完善文档管理弹窗功能（接入真实数据、上传逻辑）
3. 停止状态应该用于发送按钮，而不是另外在弄出一个按钮
