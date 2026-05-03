# AGENTS设计规范

- 禁止在业务代码中直接写长 prompt 字符串
- 所有 prompt 必须抽离到独立文件管理
- ingestion（导入/处理）与 query（检索/问答）必须独立模块
- 禁止交叉调用