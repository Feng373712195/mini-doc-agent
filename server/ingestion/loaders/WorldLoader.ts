import fs from "node:fs/promises";

export async function loadWordAsText(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  // Lightweight fallback parser for .doc/.docx until a dedicated parser is added.
  return data
    .toString("utf8")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u4e00-\u9fa5]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
