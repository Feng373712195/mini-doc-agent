/**
 * 应用配置
 * 集中管理项目中的配置常量
 */

/**
 * 分页配置
 */
export const PAGINATION_CONFIG = {
  /** 文档列表默认每页条数 */
  defaultPageSize: 3,
  /** 消息列表每页条数 */
  messagePageSize: 50,
} as const;

/**
 * 文档分块配置
 */
export const CHUNK_CONFIG = {
  /** 每个文本块的最大字符数 */
  chunkSize: 800,
  /** 相邻文本块之间的重叠字符数 */
  chunkOverlap: 100,
} as const;

/**
 * 文件上传配置
 */
export const UPLOAD_CONFIG = {
  /** 最大文件大小（字节），默认 10MB */
  maxFileSize: 10 * 1024 * 1024,
  /** 文件名最大长度（字符数） */
  maxFilenameLength: 200,
  /** 允许的文件扩展名白名单 */
  allowedExtensions: [".pdf", ".doc", ".docx"],
} as const;
