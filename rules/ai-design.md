# AGENTS设计规范

- 禁止在业务代码中直接写长 prompt 字符串
- Prompt 必须独立存放于 /prompts 目录中，禁止在业务代码中硬编码。
- Prompt 使用 .md 格式，并通过占位符进行变量注入。
- ingestion（导入/处理）与 query（检索/问答）必须独立模块
- 禁止交叉调用

## Prompt 设计示例

### 如何加载 Prompt

```JavaScript
// loadPrompt函数位置在 /server/utils/index.ts
const template = loadPrompt("query_rewrite")

const prompt = template.replace("{{query}}", userQuery)
```

### Prompt文件设计

/prompts
  /分层A
    a.md
  /分层B
    a.md

