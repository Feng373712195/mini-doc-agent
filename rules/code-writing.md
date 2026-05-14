# 代码编写规范

- 文件 >300行必须拆分
- 函数 >50行必须拆分
- 复杂逻辑必须模块化
- 核心模块必须使用设计模式组织代码
- 禁止过度设计（避免模式滥用）
- 所有 mock / demo 数据必须独立存放
- 禁止与正式逻辑混写
- import 引用文件路径,必须优先考虑是否可以使用别名
- 必须严格遵循 Nuxt3 项目结构与最佳实践进行开发
    - 包括 pages / components / composables / server 目录规范。
    - 所有数据请求必须使用项目已封装的 API service 层，不允许直接使用原生 fetch 或 axios 直连接口。
    - 页面数据获取必须优先使用 useAsyncData / useFetch，并遵循 SSR 兼容原则。
    - 禁止在页面中直接编写业务请求逻辑，必须抽离到 composables 或 service 层。
    - 所有功能实现必须保证类型安全（TypeScript），并处理基础错误状态（loading / error / empty）。

## 请严格遵守以下 TypeScript 规范：

- 禁止使用 any
- 允许使用 unknown，但必须进行类型收窄
- 所有函数必须显式声明返回类型
- 所有对象必须显式声明类型
- 禁止使用隐式 any
- 禁止省略 import
- 禁止使用大型混合 interface
- Promise 必须处理错误
- 输出代码必须通过 strict 模式 TypeScript 编译
- 不允许为了通过编译而滥用类型断言

## mock 设计示例

### 数据 Mock（静态数据）

存放在根目录 /mocks 文件夹

示例：
```JavaScript
//mocks/chunks.mock.ts
export const mockChunks = [
  {
    id: "1",
    content: "Vue uses Proxy for reactivity...",
    source: "vue-docs"
  }
]
```

### 服务 Mock（行为模拟）

存放在根目录 /server/api/**.mock.ts 文件

示例：
```JavaScript
// search.service.ts（真实）
export class SearchService {
  async search(query) {
    // 调vector DB
  }
}
```

```JavaScript
// search.mock.ts（mock）
export class MockSearchService {
  async search(query) {
    return mockChunks
  }
}
```