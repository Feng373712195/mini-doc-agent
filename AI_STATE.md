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

## 下一步计划

1. 补齐上传进度与文档状态的前端接入
2. 增强错误处理与重试策略（上传、解析、入库）
3. 增加 ingestion 链路单元测试与集成测试





