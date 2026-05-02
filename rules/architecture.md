# 架构规范

- 前端禁止直接调用模型 API
- AI请求必须走 /server/api
- 业务逻辑必须在 server 层
- 前端只负责展示