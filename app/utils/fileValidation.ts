/**
 * 文件验证工具函数
 * 提供统一的文件类型和 URL 验证功能
 */

/**
 * 文件验证结果
 */
export interface FileValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 错误信息（验证失败时） */
  error?: string;
}

/**
 * 获取文件扩展名（小写）
 * @param filename 文件名
 * @returns 文件扩展名（包含点号，如 ".pdf"）
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1) return "";
  return filename.slice(lastDotIndex).toLowerCase();
}

/**
 * 通用文件类型验证
 * @param file 待验证的文件对象
 * @param allowedTypes 允许的 MIME 类型列表
 * @param allowedExtensions 允许的文件扩展名列表（小写，包含点号）
 * @param errorMessage 验证失败时的错误消息
 * @returns 验证结果
 */
export function validateFileType(
  file: File,
  allowedTypes: string[],
  allowedExtensions: string[],
  errorMessage: string,
): FileValidationResult {
  const fileExtension = getFileExtension(file.name);
  const isValidType = allowedTypes.includes(file.type);
  const isValidExtension = allowedExtensions.includes(fileExtension);

  if (!isValidType && !isValidExtension) {
    return { valid: false, error: errorMessage };
  }

  return { valid: true };
}

/**
 * 验证 PDF 文件
 * @param file 待验证的文件对象
 * @returns 验证结果
 */
export function validatePdfFile(file: File): FileValidationResult {
  return validateFileType(
    file,
    ["application/pdf"],
    [".pdf"],
    "只能上传 PDF 文件",
  );
}

/**
 * 验证 Word 文件
 * @param file 待验证的文件对象
 * @returns 验证结果
 */
export function validateWordFile(file: File): FileValidationResult {
  return validateFileType(
    file,
    [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    [".doc", ".docx"],
    "只能上传 Word 文件",
  );
}

/**
 * 验证 URL 格式（必须以 http:// 或 https:// 开头）
 * @param url 待验证的 URL 字符串
 * @returns 是否为有效的 URL
 */
export function validateUrl(url: string): boolean {
  const regex = /^https?:\/\/.+/;
  return regex.test(url);
}
