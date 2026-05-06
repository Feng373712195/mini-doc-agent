# AGENTS.md

## 规则系统（必须遵守）

AI执行任务时必须遵守以下规则：

- 必须遵守 项目规范（/rules/project.md）
- 必须遵守 技术栈规范（/rules/tech-stack.md）
- 必须遵守 代码风格规范（/rules/code-style.md）
- 必须遵守 代码编写规范（/rules/code-writing.md）
- 必须遵守 UI规范（/rules/ui.md）
- 必须遵守 样式规范（/rules/style.md）
- 必须遵守 API规范（/rules/api-contract.md）
- 必须遵守 测试规范（/rules/testing.md）
- 必须遵守 Git规范（/rules/git.md）
- 必须遵守 安全规范（/rules/security.md）
- 必须遵守 工作流规范（/rules/workflow.md）
- 必须遵守 AI行为规范（/rules/ai-behavior.md）
- 必须遵守 AI设计规范（/rules/ai-design.md）
- 必须遵守 Review规范（/rules/review.md）
- 必须遵守 任务定义规范（/rules/task-definition.md）
- 必须遵守 输出规范（/rules/output.md）
- 必须遵守 架构规范（/rules/architecture.md）
- 必须遵守 复用规范（/rules/reuse.md）
- 必须遵循 样式规范（/DESIGN.md）

---

## 执行原则

- 必须按规则系统执行
- 禁止擅自修改 AGENTS.md
- 必须更新 AI_STATE.md
  - 历史变更必须只保留最近5条
  - 禁止修改当前结构，必须根据当前结构进行内容输出
- 必须进行任务拆分与自检，禁止额外生成文件或文档。
- 任何文件的以下操作必须获得用户明确确认：
  - 删除文件
  - 重命名文件
  - 移动文件
  - 覆盖重写文件（原内容丢失超过 30%）
  - 重构文件结构
