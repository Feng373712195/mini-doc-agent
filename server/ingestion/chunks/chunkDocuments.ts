import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import ts from "typescript";
import crypto from "node:crypto";
import type { RawDocument } from "~~/server/ingestion/sources/IDataSource";

export type IngestionChunk = {
  chunkId: string;
  documentId: string;
  content: string;
  metadata: {
    documentId: string;
    sourceType: "github" | "pdf" | "word";
    chunkIndex: number;
    branch: string | null;
    filePath: string | null;
    symbol: "function" | "class" | "unknown";
    type: string;
  };
};

function normalizeContent(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

function buildChunkId(input: {
  documentId: string;
  filePath: string | null;
  chunkIndex: number;
  content: string;
}) {
  const normalized = normalizeContent(input.content);
  return crypto
    .createHash("sha256")
    .update(`${input.documentId}|${input.filePath || ""}|${input.chunkIndex}|${normalized}`)
    .digest("hex");
}

function extractCodeSymbols(content: string): Array<{ text: string; symbol: "function" | "class" }> {
  const source = ts.createSourceFile("file.ts", content, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const symbols: Array<{ text: string; symbol: "function" | "class" }> = [];

  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      symbols.push({ text: node.getText(source), symbol: "function" });
    } else if (ts.isClassDeclaration(node) && node.name) {
      symbols.push({ text: node.getText(source), symbol: "class" });
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return symbols;
}

export async function chunkDocuments(documents: RawDocument[]): Promise<IngestionChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 100 });
  const chunks: IngestionChunk[] = [];

  for (const doc of documents) {
    const fileType = doc.metadata.type || "unknown";
    const isCode = fileType === "ts" || fileType === "js";

    if (isCode) {
      const symbols = extractCodeSymbols(doc.content);
      if (symbols.length > 0) {
        symbols.forEach((item, index) => {
          const chunkId = buildChunkId({
            documentId: doc.documentId,
            filePath: doc.metadata.filePath || null,
            chunkIndex: index,
            content: item.text,
          });
          chunks.push({
            chunkId,
            documentId: doc.documentId,
            content: item.text,
            metadata: {
              documentId: doc.documentId,
              sourceType: doc.metadata.sourceType,
              chunkIndex: index,
              branch: doc.metadata.branch ?? null,
              filePath: doc.metadata.filePath ?? null,
              symbol: item.symbol,
              type: fileType,
            },
          });
        });
        continue;
      }
    }

    const split = await splitter.splitText(doc.content);
    split.forEach((text, index) => {
      const chunkId = buildChunkId({
        documentId: doc.documentId,
        filePath: doc.metadata.filePath || null,
        chunkIndex: index,
        content: text,
      });
      chunks.push({
        chunkId,
        documentId: doc.documentId,
        content: text,
        metadata: {
          documentId: doc.documentId,
          sourceType: doc.metadata.sourceType,
          chunkIndex: index,
          branch: doc.metadata.branch ?? null,
          filePath: doc.metadata.filePath ?? null,
          symbol: "unknown",
          type: fileType,
        },
      });
    });
  }

  return chunks;
}
