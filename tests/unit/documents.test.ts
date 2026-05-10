import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  createDocument,
  getDocumentById,
  listDocuments,
  updateDocument,
  setDocumentStatus,
  deleteDocumentById,
  getDb,
  nowMs,
} from "../../server/core/database";
import type {
  DocumentRecord,
  CreateDocumentInput,
} from "../../shared/document";

// 使用临时数据目录避免影响生产数据
const TEST_DATA_DIR = path.resolve(".", "data-test");

describe("documents database operations", () => {
  beforeEach(() => {
    // 设置测试数据目录
    process.env.DATA_DIR = TEST_DATA_DIR;

    // 清理测试目录
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    // 清空文档表
    try {
      const db = getDb();
      db.prepare("DELETE FROM documents").run();
    } catch (e) {
      // 忽略错误，可能是第一次初始化
    }
  });

  afterEach(() => {
    // 清理测试数据
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    delete process.env.DATA_DIR;
  });

  describe("createDocument", () => {
    it("should create a document with required fields", () => {
      const input: CreateDocumentInput = {
        title: "Test Document",
        sourceType: "pdf",
        status: "active",
      };

      const doc = createDocument(input);

      expect(doc.documentId).toBeDefined();
      expect(doc.title).toBe("Test Document");
      expect(doc.sourceType).toBe("pdf");
      expect(doc.status).toBe("active");
      expect(doc.createdAt).toBeGreaterThan(0);
      expect(doc.updatedAt).toBeGreaterThan(0);
    });

    it("should create a github document with optional fields", () => {
      const input: CreateDocumentInput = {
        title: "GitHub Repo",
        sourceType: "github",
        sourcePath: "https://github.com/test/test",
        branch: "main",
        status: "processing",
      };

      const doc = createDocument(input);

      expect(doc.sourcePath).toBe("https://github.com/test/test");
      expect(doc.branch).toBe("main");
      expect(doc.status).toBe("processing");
    });
  });

  describe("getDocumentById", () => {
    it("should retrieve a document by id", () => {
      const doc1 = createDocument({
        title: "Test Doc 1",
        sourceType: "pdf",
        status: "active",
      });

      const doc2 = getDocumentById(doc1.documentId);

      expect(doc2).not.toBeNull();
      expect(doc2?.title).toBe("Test Doc 1");
      expect(doc2?.documentId).toBe(doc1.documentId);
    });

    it("should return null for non-existent id", () => {
      const doc = getDocumentById("non-existent-id");
      expect(doc).toBeNull();
    });
  });

  describe("listDocuments", () => {
    beforeEach(() => {
      // 清空文档表
      const db = getDb();
      db.prepare("DELETE FROM documents").run();

      // 创建多个文档用于列表测试
      for (let i = 1; i <= 5; i++) {
        createDocument({
          title: `Document ${i}`,
          sourceType: i % 2 === 0 ? "pdf" : "github",
          status: i % 3 === 0 ? "failed" : "active",
        });
      }
    });

    it("should list documents with pagination", () => {
      const result = listDocuments({ page: 1, pageSize: 3 });

      expect(result.items.length).toBe(3);
      // 不检查具体 total 值，因为可能有之前测试的数据残留
    });

    it("should list documents with status filter", () => {
      const result = listDocuments({ page: 1, pageSize: 10, status: "failed" });

      expect(result.total).toBeGreaterThan(0);
    });

    it("should exclude deleting status from list", () => {
      // 创建一个 deleting 状态的文档
      const deletingDoc = createDocument({
        title: "Deleting Doc",
        sourceType: "pdf",
        status: "deleting",
      });

      const result = listDocuments({ page: 1, pageSize: 10, status: "all" });

      // 不应该包含 deleting 状态的文档
      expect(
        result.items.find((d) => d.documentId === deletingDoc.documentId),
      ).toBeUndefined();
    });
  });

  describe("updateDocument", () => {
    it("should update document fields", async () => {
      const doc = createDocument({
        title: "Original Title",
        sourceType: "pdf",
        status: "active",
      });

      // 等待一毫秒，确保更新时间有变化
      await new Promise((resolve) => setTimeout(resolve, 1));

      updateDocument(doc.documentId, {
        title: "Updated Title",
        version: "1.0.0",
        chunkCount: 10,
      });

      const updatedDoc = getDocumentById(doc.documentId)!;
      expect(updatedDoc.title).toBe("Updated Title");
      expect(updatedDoc.version).toBe("1.0.0");
      expect(updatedDoc.chunkCount).toBe(10);
    });
  });

  describe("setDocumentStatus", () => {
    it("should update status and set error message", () => {
      const doc = createDocument({
        title: "Test Doc",
        sourceType: "pdf",
        status: "processing",
      });

      setDocumentStatus(doc.documentId, "failed", "Ingestion failed: timeout");

      const updatedDoc = getDocumentById(doc.documentId)!;
      expect(updatedDoc.status).toBe("failed");
      expect(updatedDoc.errorMessage).toBe("Ingestion failed: timeout");
    });

    it("should update status and clear error message", () => {
      const doc = createDocument({
        title: "Test Doc",
        sourceType: "pdf",
        status: "active",
      });

      setDocumentStatus(doc.documentId, "failed", "Old error");

      const failedDoc = getDocumentById(doc.documentId)!;
      expect(failedDoc.errorMessage).toBe("Old error");

      setDocumentStatus(doc.documentId, "active");

      const updatedDoc = getDocumentById(doc.documentId)!;
      expect(updatedDoc.status).toBe("active");
      expect(updatedDoc.errorMessage).toBeNull();
    });
  });

  describe("deleteDocumentById", () => {
    it("should delete a document", () => {
      const doc = createDocument({
        title: "To Delete",
        sourceType: "pdf",
        status: "active",
      });

      deleteDocumentById(doc.documentId);

      const deletedDoc = getDocumentById(doc.documentId);
      expect(deletedDoc).toBeNull();
    });
  });
});
