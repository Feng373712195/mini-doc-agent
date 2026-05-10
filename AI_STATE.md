# AI_STATE.md

> 目的：记录项目在当前时刻的真实状态，便于协作、Review 与后续迭代。

## 版本

- 当前项目版本：v1.0
- 代码分支：`main`

## 当前架构

- 应用类型：Nuxt 全栈（前端 SSR/CSR + Nitro Server Routes）
- 前端目录：`app/`
- 服务端目录：`server/`
  - `server/api/`：HTTP 接口
  - `server/core/`：核心业务与数据库访问
  - `server/services/`：外部服务封装（LLM、Embedding、VectorStore）
  - `server/ingestion/`：文档接入与处理流水线
- 持久化：SQLite（`data/chat.db`）
- 向量库：Chroma（单 collection，计划本地持久化目录 `chroma-data/`）

## 当前模块状态

- Chat 主流程：可用（会话、消息、SSE 流式回复）
- 文档上传入口：已新增 `POST /api/ingestion/upload`（multipart/form-data）
- Ingestion 任务进度：已新增 `GET /api/ingestion/jobs/:jobId/events`（SSE）
- 文档数据表：已新增 `documents` 表及相关索引
- 检索链路：已切换为 Chroma 服务调用（支持基础 metadata filter 入参）

## 本轮已完成任务

- 任务6：阶段状态联动收口（2026-05-10）
  - unIngestionJob 已实现 stage 落库：queued/parsing/chunking/embedding/indexing/completed/failed
  - 成功写入 status=active,currentStage=completed,lastIngestedAt；失败写入 status=failed,currentStage=failed,errorMessage`r
  - GitHub refresh 链路已补齐阶段落库
  - 
pm run typecheck 通过

- 任务5：文档更新接口（2026-05-10）
  - 新增 POST /api/documents/:id/refresh`r
  - GitHub 类型支持后台覆盖重建（processing + queued -> completed/failed）
  - PDF/Word 返回 
eed_reupload，前端复用上传弹窗处理
  - 失败回滚原状态并写入错误信息
  - 
pm run typecheck 通过

- 任务4：文档删除接口（2026-05-10）
  - 新增 DELETE /api/documents/:id，采用软删受理（先置 deleting）
  - 后端异步执行删除向量与物理删文档
  - 删除失败自动回滚到原状态并写入错误信息
  - 
pm run typecheck 通过

- 任务3：文档停用/启用接口（2026-05-10）
  - 新增 PATCH /api/documents/:id/status（仅允许 active/inactive）
  - uploading/processing/deleting 状态下禁止切换
  - 
pm run typecheck 通过

- 任务2：文档查询接口（2026-05-10）
  - 新增 GET /api/documents（分页、状态筛选、createdAt 倒序）
  - 新增 GET /api/documents/:id（详情）
  - 列表查询默认隐藏 deleting 状态（含 all 筛选）
  - 
pm run typecheck 通过

- 任务1：数据层改造（2026-05-10）
  - documents 增加 current_stage 字段（兼容旧库自动补列）
  - shared/document.ts 新增 DocumentStage 类型
  - 文档读写映射已接入 currentStage 字段
  - 
pm run typecheck 通过

- 前端接入：文档上传与进度展示（2026-05-10）
  - UploadView.vue 已接入 /api/ingestion/upload，支持 github/pdf/word 三类上传
  - 已接入 /api/ingestion/jobs/:jobId/events SSE，展示阶段进度与成功/失败提示
  - 
pm run typecheck 与 
pm run test:unit 通过

- 修复：Typecheck CSS 声明缺失（2026-05-10）
  - 新增 pp/types/style.d.ts，声明 declare module '*.css'，解决 nt-design-vue/dist/reset.css 的 TS2882 报错
  - 
pm run typecheck 已通过

- 任务8：验证与收尾（2026-05-10）
  - 
pm run test:unit 通过
  - 
pm run typecheck 仍有既有问题：pp/plugins/antd.ts 对 nt-design-vue/dist/reset.css 的类型声明缺失

- 任务7：旧 ingest/HNSW 链路清理（2026-05-10）
  - 移除 scripts/ingest.ts 与 package.json 中 ingest 脚本
  - 移除 hnswlib-node 可选依赖，补充 chromadb 依赖
  - 根 README.md 已改为统一上传 + ingestion job 进度订阅流程

- 任务1：文档数据层重构
  - 新增 `shared/document.ts`
  - `server/core/database.ts` 增加 documents 表、索引、状态流转与 CRUD
- 任务2：统一上传接口骨架
  - 新增 `server/api/ingestion/upload.post.ts`
  - 新增 `shared/ingestion.ts`
- 任务3：异步任务与进度通道
  - 新增 `server/services/ingestionJobs.ts`
  - 新增 `server/api/ingestion/jobs/[jobId]/events.get.ts`
- 任务4：Ingestion Pipeline 主链路
  - 完成 `server/ingestion/` 下 sources/loaders/chunks/pipeline/runUploadIngestion
  - GitHub Source 支持 sparse-checkout + 白名单目录/后缀过滤
- 任务5：向量存储切换 Chroma
  - `server/services/vectorStore.ts` 重构为 Chroma 单集合服务
- 任务6：检索改造
  - `server/core/retrieval.ts` 改为使用 Chroma 向量服务

## 已知问题

- 由于当前环境 `npm.ps1` 执行策略限制，`npm run typecheck` 需通过 `cmd /c npm run ...` 执行。
- Chroma 连接依赖服务可用性（默认 `http://localhost:8000`），需在下一轮补齐本地持久化运行说明与启动方案。
- 前端文档管理弹窗尚未接入上传接口与 SSE 进度展示。

## 下一步任务

> 目标：以下任务应当做到“交给其他 AI 也能直接按步骤落地”。
> 执行节奏：**每完成 1 条任务就暂停**，更新 AI_STATE + 提交代码，然后等待用户确认。
> 统一约束：
> - 严格遵守 `AGENTS.md` 与 `rules/*`。
> - 所有接口统一返回：`{ code, message, data, timestamp }`。
> - 前端列表默认隐藏 `deleting`（即使 status=all）。
> - 失败错误 `errorMessage` 仅在 `status=failed` 的详情中展示。
> - 当前阶段枚举：`queued|parsing|chunking|embedding|indexing|completed|failed`。

1. 任务6：阶段状态联动收口（后端）
   - 目的：让 `documents.status` 与 `documents.currentStage` 全程可追踪，替代前端 SSE 依赖。
   - 需要改的文件：
     - `server/services/ingestionJobs.ts`
     - `server/ingestion/runUploadIngestion.ts`
     - `server/core/database.ts`（若缺 helper）
   - 实现要求：
     - 上传/更新（github）进入处理时：
       - `status=processing`
       - `currentStage=queued`
       - `errorMessage=null`
     - 流程推进时依次写入：`parsing -> chunking -> embedding -> indexing`。
     - 成功：`status=active, currentStage=completed, lastIngestedAt=now`。
     - 失败：`status=failed, currentStage=failed, errorMessage=具体错误`。
   - 兼容要求：
     - 保留 SSE 后端能力，但前端本轮不强依赖。
   - 验收：
     - 手工触发一次 github 上传后，在数据库能看到阶段变化与最终状态。

2. 任务7：文档列表与详情 API 强约束（后端）
   - 目的：给前端提供稳定分页、筛选、详情能力。
   - 需要改的文件：
     - `server/api/documents.get.ts`
     - `server/api/documents/[id]/index.get.ts`
     - `server/core/database.ts`
   - 接口契约：
     - `GET /api/documents?page=1&pageSize=3&status=all`
       - `status` 允许：`all|uploading|processing|active|failed|inactive|deleting`
       - 但实际列表总是排除 `deleting`
       - 排序固定 `createdAt DESC`
       - 返回：
         - `data.items: DocumentRecord[]`
         - `data.pagination: { page, pageSize, total }`
     - `GET /api/documents/:id`
       - 返回完整文档详情字段
   - 验收：
     - 创建多条文档后，第一页总是最新 3 条。
     - 指定 status 筛选生效。

3. 任务8：列表页替换静态数据（前端）
   - 目的：`ListView` 从真实接口读数据，支持分页与状态显示。
   - 需要改的文件：
     - `app/pages/index/components/DocsModal/ListView.vue`
     - `app/pages/index/components/DocsModal/index.vue`（如需事件通信）
   - UI 与交互：
     - 列：`文档名称 | 类型 | 创建时间 | 状态 | 操作`
     - 分页：每页固定 3 条
     - 状态中文映射：
       - uploading=上传中
       - processing=处理中
       - active=使用中
       - failed=失败
       - inactive=停用
       - deleting 不显示
   - 验收：
     - 打开文档弹窗可看到真实数据，不再是 mock 数据。

4. 任务9：操作列（停用/启用、详情、更多）
   - 目的：完成文档运维基础操作。
   - 需要改的文件：
     - `app/pages/index/components/DocsModal/ListView.vue`
   - 操作按钮：
     - 主操作：`停用/启用`、`详情`
     - 更多（Dropdown/Popover）：`删除`、`更新`
   - 禁用规则：
     - `uploading|processing|deleting` 时禁用全部操作
   - 二次确认文案（必须逐字一致）：
     - 删除：`确认删除【文档标题】该文档吗？删除后将同时移除相关索引数据，且不可恢复。`
     - 更新：`确认更新【文档标题】该该文档吗？系统将覆盖当前内容并重建索引，过程中文档状态会变为处理中。`
   - 验收：
     - 按钮状态与文档状态联动正确。

5. 任务10：删除流程前后端闭环（软删 + 列表消失）
   - 目的：实现“安全删除 + 用户视角立即消失”。
   - 需要改的文件：
     - `server/api/documents/[id]/index.delete.ts`
     - `server/core/database.ts`
     - `app/pages/index/components/DocsModal/ListView.vue`
   - 后端流程：
     - 仅 `active|inactive|failed` 可删
     - 接口立即返回受理：`status=deleting`
     - 异步执行：删向量 -> 物理删文档
     - 失败：回滚原状态 + 写 `errorMessage`
   - 前端流程：
     - 删除受理后刷新列表，因默认隐藏 `deleting`，该条立即消失
     - 本轮不做失败主动通知（用户后续可在列表/详情发现）
   - 验收：
     - 删除成功后列表消失且数据库物理删除。
     - 删除失败后文档重新出现并可查看失败原因。

6. 任务11：更新流程闭环（github 重建 / pdf-word 重传）
   - 目的：统一“覆盖更新”体验。
   - 需要改的文件：
     - `server/api/documents/[id]/refresh.post.ts`
     - `app/pages/index/components/DocsModal/ListView.vue`
     - `app/pages/index/components/DocsModal/index.vue`
     - `app/pages/index/components/DocsModal/UploadView.vue`
   - 后端规则：
     - GitHub：直接后台重拉重建（先 processing，再 completed/failed）
     - PDF/Word：返回 `need_reupload`
     - 更新失败：回滚到更新前状态并写 `errorMessage`
   - 前端规则：
     - GitHub 更新：调用 refresh 后回列表并刷新第一页
     - PDF/Word 更新：跳上传视图并预选类型，重传后回列表刷新
   - 验收：
     - 三类来源都能完成“覆盖更新”闭环。

7. 任务12：详情弹窗与失败信息展示
   - 目的：让用户自行排查失败原因，不依赖消息中心。
   - 需要改的文件：
     - `app/pages/index/components/DocsModal/`（新增详情组件）
   - 展示字段：
     - `documentId, title, sourceType, sourcePath, branch, status, currentStage, createdAt, updatedAt, lastIngestedAt, chunkCount, version`
   - 错误展示：
     - 仅 `status=failed` 时展示 `errorMessage`
   - 验收：
     - 失败文档可在详情看到具体错误，非失败状态不展示错误区。

8. 任务13：上传成功回流与列表刷新
   - 目的：上传完成后用户回到列表并看到最新结果。
   - 需要改的文件：
     - `app/pages/index/components/DocsModal/UploadView.vue`
     - `app/pages/index/components/DocsModal/index.vue`
     - `app/pages/index/components/DocsModal/ListView.vue`
   - 行为要求：
     - 上传成功后自动切回列表视图
     - 强制刷新第一页
     - 列表排序按 `createdAt DESC`
   - 验收：
     - 新上传文档出现在第一页顶部。

9. 任务14：最终验证与交付整理
   - 命令验证：
     - `cmd /c npm run -s typecheck`
     - `cmd /c npm run -s test:unit`
   - 功能验证清单：
     - 列表查询/筛选/分页
     - 详情弹窗
     - 停用/启用
     - 删除（成功与失败回滚）
     - 更新（github 与 pdf/word）
   - 文档同步：
     - 更新 `AI_STATE.md`：完成项、已知问题、后续建议

10. 每任务完成后的固定动作（必须执行）
   - 1) 更新 `AI_STATE.md` 当前进度
   - 2) 提交 Git（Conventional Commit 中文）
   - 3) 尝试 push 到 GitHub（失败记录原因并重试）
   - 4) 立即暂停，等待用户确认下一条任务

