import fs from "node:fs/promises";

export async function loadPdfAsText(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  // Lightweight fallback parser: keeps printable text only.
  return data
    .toString("utf8")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u4e00-\u9fa5]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
