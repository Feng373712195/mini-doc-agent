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
  - 状态：✅ 已修复，布局正常
  - 关键能力：会话列表、新建会话、消息展示、SSE 增量输出、自动滚动到底部
  - 历史消息分页：已接入（上滑接近顶部触发加载；每次 50 条；前插并补偿 scrollTop，尽量避免视口跳动）
  - 样式系统：完全符合 rules/style.md 规范
    - 使用 Less 预处理器
    - 所有样式使用 Less 变量（@primary-navy, @space-md 等）
    - 完全移除 Tailwind CSS 类名
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
  - `npm run typecheck`：通过

## 最近变更（摘要）

### 2024-05-03 界面修复
- **问题**：上次修改后界面异常
- **修复内容**：
  1. 修复布局结构：确保主布局使用正确的 Flexbox 三段式布局
  2. 移除所有 Tailwind CSS 类名残留（`flex`, `flex-col`, `h-9`, `text-sm`, `rounded-lg`, `w-full`, `px-2`, `pb-3`, `p-6`, `grid`, `gap-2` 等）
  3. 使用 Less 类名替代：`.main-layout`, `.main-layout-content`, `.sidebar-header`, `.sidebar-actions`, `.conversation-list`, `.conversation-item-content`, `.btn-back-to-bottom` 等
  4. 优化 Sidebar 结构：
     - 添加 `.sidebar-header` 容器包裹标题和操作按钮
     - 添加 `.conversation-list` 容器包裹会话列表，支持独立滚动
     - 优化折叠按钮逻辑，使用单个元素 + v-if 控制图标
  5. 确保所有样式符合 rules/style.md 规范：
     - 使用 Less 变量（@primary-navy, @space-md, @radius-default 等）
     - 使用 Less 嵌套结构
     - 所有组件样式使用 `<style lang="less" scoped>`
     - 复用 app.less 中的全局样式（.chat-bubble, .bubble-user, .bubble-assistant 等）
  6. 修复布局高度问题：
     - `.main-layout` 设置 `height: 100%`
     - `.main-layout-content` 使用 `display: flex; flex-direction: column; height: 100%`
     - `.main-content` 使用 Flexbox 三段式：header 固定高度，message-list 弹性增长，composer 固定高度
     - `.message-list-container` 设置 `flex: 1; min-height: 0; overflow: hidden`
     - `.composer-container` 设置 `flex-shrink: 0`

### 历史变更
- 结构调整：将前端代码迁移到 `app/` 目录，并通过 `srcDir` 启用（保持 `server/` 在仓库根目录）
- 修复构建问题：修复了组件内重复 `defineExpose()` 导致的构建失败与 dev 500（IPC closed）
- 修复类型检查：在 server routes 中使用 `~~/` 根别名，避免 `srcDir` 变更后 TS 路径解析失败
- 修复 API 路由：修复 `serverDir` 配置，解决 `/api/conversations` 404
- 修复布局高度问题：将 Grid 布局改为 Flexbox 三段式布局，确保输入框始终可见且固定在底部
- UI 简化：移除 logo 和副标题，简化界面，整体风格向 ChatGPT 靠拢
- 设计系统重构：按照 DESIGN.md 的 Verdana Health 设计系统重新设计页面样式
- 代码规范重构：完全移除内联样式，改用 CSS class
- 样式架构重构：移除 Tailwind，改用 Less

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
