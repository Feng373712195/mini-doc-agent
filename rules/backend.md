# 后端代码设计规范

## 所有后端接口必须遵循 RESTful 资源设计：

1. 使用名词资源路径，不使用动词
2. 统一 JSON 响应结构：
   { code, message, data, timestamp }
3. 所有列表接口必须支持分页（page/pageSize）
4. 所有搜索接口统一为 /search
5. ingestion 类接口必须幂等
6. 禁止自定义返回结构
7. 禁止绕过 service 层直接操作数据源
