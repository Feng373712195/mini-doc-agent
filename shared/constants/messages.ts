/**
 * 错误消息常量
 * 统一管理用户可见的错误提示，提升用户体验
 */

/**
 * 通用错误消息
 */
export const ERROR_MESSAGES = {
  NOT_FOUND: "未找到资源",
  UNAUTHORIZED: "未授权访问",
  FORBIDDEN: "禁止访问",
  BAD_REQUEST: "请求参数错误",
  INTERNAL_ERROR: "服务器内部错误",

  // 文档相关
  DOCUMENT_NOT_FOUND: "文档不存在",
  DOCUMENT_BUSY: "文档正在处理中，无法操作",
  DOCUMENT_STATUS_INVALID: "文档状态不允许此操作",
  DOCUMENT_DELETE_FAILED: "删除文档失败",
  DOCUMENT_REFRESH_FAILED: "刷新文档失败",

  // 上传相关
  FILE_TOO_LARGE: "文件大小超过限制",
  FILE_TYPE_INVALID: "不支持的文件类型",
  UPLOAD_FAILED: "上传失败",
  MISSING_FILE: "缺少文件",
  MISSING_FORM_DATA: "缺少表单数据",

  // 参数相关
  INVALID_TYPE: "类型参数无效",
  INVALID_STATUS: "状态参数无效",
  MISSING_REPO_URL: "缺少仓库地址",
  MISSING_DOCUMENT_ID: "缺少文档ID",
} as const;

/**
 * 成功消息
 */
export const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: "上传成功",
  DELETE_SUCCESS: "删除成功",
  UPDATE_SUCCESS: "更新成功",
  REFRESH_SUCCESS: "刷新成功",
  STATUS_UPDATED: "状态已更新",
  OPERATION_ACCEPTED: "操作已受理",
} as const;
