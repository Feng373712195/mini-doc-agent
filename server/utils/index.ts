import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 加载 prompt 模板文件
 * @param promptPath - prompt 文件路径（相对于 /prompts 目录，不含 .md 后缀）
 * @returns prompt 模板字符串
 * @example
 * const template = loadPrompt("query/doc_qa")
 * const prompt = template.replace("{{question}}", userQuery)
 */
export function loadPrompt(promptPath: string): string {
  const fullPath = join(process.cwd(), "prompts", `${promptPath}.md`);
  return readFileSync(fullPath, "utf-8");
}
