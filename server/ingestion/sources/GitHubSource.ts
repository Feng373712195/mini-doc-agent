import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import type { IDataSource, RawDocument } from "~~/server/ingestion/sources/IDataSource";

const execFileAsync = promisify(execFile);

const ALLOWED_DIR_PREFIX = ["src/", "core/", "service/", "lib/"];
const EXCLUDED_DIRS = ["node_modules", "dist", "build", "logs", ".git"];
const ALLOWED_FILES = new Set(["package.json"]);
const ALLOWED_EXT = new Set([".md", ".ts", ".js", ".config", ".yaml", ".yml", ".json"]);

function toPosix(input: string) {
  return input.split(path.sep).join("/");
}

function shouldIncludeFile(relPath: string) {
  const normalized = toPosix(relPath).replace(/^\.\//, "");
  const segments = normalized.split("/");
  if (segments.some((seg) => EXCLUDED_DIRS.includes(seg))) return false;

  if (!ALLOWED_DIR_PREFIX.some((prefix) => normalized.startsWith(prefix))) {
    if (!ALLOWED_FILES.has(path.basename(normalized))) return false;
  }

  const ext = path.extname(normalized).toLowerCase();
  return ALLOWED_EXT.has(ext) || ALLOWED_FILES.has(path.basename(normalized));
}

async function collectFiles(baseDir: string, relDir = ""): Promise<string[]> {
  const currentDir = path.join(baseDir, relDir);
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relPath = relDir ? path.join(relDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.includes(entry.name)) continue;
      files.push(...(await collectFiles(baseDir, relPath)));
      continue;
    }

    if (entry.isFile() && shouldIncludeFile(relPath)) {
      files.push(relPath);
    }
  }

  return files;
}

function detectFileType(filePath: string) {
  const name = path.basename(filePath).toLowerCase();
  if (name === "package.json") return "json";
  const ext = path.extname(filePath).toLowerCase();
  return ext.replace(/^\./, "") || "unknown";
}

export class GitHubSource implements IDataSource {
  public commitHash: string | null = null;
  public resolvedBranch: string | null = null;

  constructor(
    private readonly repoUrl: string,
    private readonly documentId: string,
    private readonly branch: string | null,
  ) {}

  async load(): Promise<RawDocument[]> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "doc-agent-gh-"));
    try {
      const cloneArgs = ["clone", "--depth", "1", "--filter=blob:none", "--sparse"];
      if (this.branch) {
        cloneArgs.push("--branch", this.branch);
      }
      cloneArgs.push(this.repoUrl, tempDir);
      await execFileAsync("git", cloneArgs);
      await execFileAsync("git", ["-C", tempDir, "sparse-checkout", "set", ...ALLOWED_DIR_PREFIX]);

      const activeBranch = (
        await execFileAsync("git", ["-C", tempDir, "rev-parse", "--abbrev-ref", "HEAD"])
      ).stdout.trim();
      this.resolvedBranch = activeBranch || this.branch;
      this.commitHash = (await execFileAsync("git", ["-C", tempDir, "rev-parse", "HEAD"])).stdout.trim();

      const files = await collectFiles(tempDir);
      const docs: RawDocument[] = [];

      for (const relPath of files) {
        const absPath = path.join(tempDir, relPath);
        const content = await fs.readFile(absPath, "utf8");
        docs.push({
          id: nanoid(),
          documentId: this.documentId,
          title: path.basename(relPath),
          content,
          metadata: {
            sourceType: "github",
            sourcePath: this.repoUrl,
            repo: this.repoUrl,
            branch: this.resolvedBranch,
            filePath: toPosix(relPath),
            symbol: "unknown",
            type: detectFileType(relPath),
          },
        });
      }

      return docs;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}
