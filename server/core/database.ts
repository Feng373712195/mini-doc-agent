import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import type { Conversation, Message, Role } from "~~/shared/chat";
import type {
  DbConversationRow,
  DbMessageRow,
} from "~~/server/types/database";

// 数据库单例
let dbSingleton: Database.Database | null = null;

/**
 * 确保目录存在，不存在则创建
 */
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * 获取数据库文件路径
 * 从环境变量读取数据目录，默认为 data/
 */
function getDbPath() {
  const dataDir = path.resolve(String(process.env.DATA_DIR || "data"));
  ensureDir(dataDir);
  return path.join(dataDir, "chat.db");
}

/**
 * 获取数据库实例（单例模式）
 * 首次调用时初始化数据库并创建表结构
 */
export function getDb() {
  if (dbSingleton) return dbSingleton;
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  
  // 启用 WAL 模式，提升并发性能
  db.pragma("journal_mode = WAL");
  
  // 创建表结构和索引
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at
      ON messages(conversation_id, created_at);
    CREATE TABLE IF NOT EXISTS documents (
      document_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_path TEXT,
      repo TEXT,
      branch TEXT,
      content_hash TEXT,
      commit_hash TEXT,
      version TEXT,
      status TEXT NOT NULL,
      current_stage TEXT,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      ingestion_job_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_ingested_at INTEGER,
      deleted_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_documents_source_type_source_path_branch
      ON documents(source_type, source_path, branch);
    CREATE INDEX IF NOT EXISTS idx_documents_status
      ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_documents_updated_at
      ON documents(updated_at DESC);
  `);
  dbSingleton = db;
  // 兼容已存在数据库：增量补齐 current_stage 字段。
  try {
    db.exec("ALTER TABLE documents ADD COLUMN current_stage TEXT;");
  } catch {
    // 列已存在时忽略。
  }
  return dbSingleton;
}

/**
 * 获取当前时间戳（毫秒）
 */
export function nowMs() {
  return Date.now();
}

/**
 * 创建新会话
 * @param title - 会话标题，默认为 "New chat"
 * @returns 创建的会话对象
 */
export function createConversation(title?: string): Conversation {
  const db = getDb();
  const ts = nowMs();
  const conversation: Conversation = {
    id: nanoid(),
    title: (title || "New chat").slice(0, 80),
    createdAt: ts,
    updatedAt: ts,
  };
  db.prepare(
    "INSERT INTO conversations(id, title, created_at, updated_at) VALUES(?, ?, ?, ?)"
  ).run(conversation.id, conversation.title, conversation.createdAt, conversation.updatedAt);
  return conversation;
}

/**
 * 获取会话列表
 * @param limit - 返回数量限制，默认 50
 * @param offset - 偏移量，默认 0
 * @returns 会话列表，按更新时间倒序
 */
export function listConversations(limit = 50, offset = 0): Conversation[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC LIMIT ? OFFSET ?"
    )
    .all(limit, offset) as DbConversationRow[];
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 更新会话的最后更新时间
 * @param conversationId - 会话 ID
 */
export function touchConversation(conversationId: string) {
  const db = getDb();
  db.prepare("UPDATE conversations SET updated_at=? WHERE id=?").run(nowMs(), conversationId);
}

/**
 * 设置会话标题
 * @param conversationId - 会话 ID
 * @param title - 新标题（自动截断到 80 字符）
 */
export function setConversationTitle(conversationId: string, title: string) {
  const db = getDb();
  db.prepare("UPDATE conversations SET title=?, updated_at=? WHERE id=?").run(
    title.slice(0, 80),
    nowMs(),
    conversationId
  );
}

/**
 * 获取会话的所有消息
 * @param conversationId - 会话 ID
 * @returns 消息列表，按创建时间升序
 */
export function getMessages(conversationId: string): Message[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, conversation_id, role, content, created_at, updated_at FROM messages WHERE conversation_id=? ORDER BY created_at ASC"
    )
    .all(conversationId) as DbMessageRow[];
  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as Role,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 分页获取会话消息
 * 支持向前翻页（加载更早的消息）
 * 
 * @param params.conversationId - 会话 ID
 * @param params.limit - 每页数量（1-200）
 * @param params.beforeCreatedAt - 可选，获取此时间戳之前的消息
 * @returns 消息列表，按创建时间升序（适合 UI 渲染）
 */
export function getMessagesPage(params: {
  conversationId: string;
  limit: number;
  beforeCreatedAt?: number;
}): Message[] {
  const db = getDb();
  const limit = Math.min(Math.max(params.limit, 1), 200);
  const beforeCreatedAt = params.beforeCreatedAt ? Number(params.beforeCreatedAt) : undefined;

  const rows = beforeCreatedAt
    ? (db
        .prepare(
          "SELECT id, conversation_id, role, content, created_at, updated_at FROM messages WHERE conversation_id=? AND created_at < ? ORDER BY created_at DESC LIMIT ?"
        )
        .all(params.conversationId, beforeCreatedAt, limit) as DbMessageRow[])
    : (db
        .prepare(
          "SELECT id, conversation_id, role, content, created_at, updated_at FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT ?"
        )
        .all(params.conversationId, limit) as DbMessageRow[]);

  // 查询结果是倒序的（DESC），需要反转为升序以便 UI 渲染
  return rows.reverse().map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as Role,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 插入新消息
 * @param params.conversationId - 会话 ID
 * @param params.role - 消息角色（user/assistant）
 * @param params.content - 消息内容
 * @returns 创建的消息对象
 */
export function insertMessage(params: {
  conversationId: string;
  role: Role;
  content: string;
}): Message {
  const db = getDb();
  const ts = nowMs();
  const msg: Message = {
    id: nanoid(),
    conversationId: params.conversationId,
    role: params.role,
    content: params.content,
    createdAt: ts,
    updatedAt: ts,
  };
  db.prepare(
    "INSERT INTO messages(id, conversation_id, role, content, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)"
  ).run(msg.id, msg.conversationId, msg.role, msg.content, msg.createdAt, msg.updatedAt);
  touchConversation(params.conversationId);
  return msg;
}

/**
 * 更新消息内容
 * @param messageId - 消息 ID
 * @param content - 新内容
 */
export function updateMessageContent(messageId: string, content: string) {
  const db = getDb();
  db.prepare("UPDATE messages SET content=?, updated_at=? WHERE id=?").run(content, nowMs(), messageId);
}

/**
 * 获取会话中最新的用户消息
 * @param conversationId - 会话 ID
 * @returns 最新的用户消息，不存在则返回 null
 */
export function getLatestUserMessage(conversationId: string): Message | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, conversation_id, role, content, created_at, updated_at FROM messages WHERE conversation_id=? AND role='user' ORDER BY created_at DESC LIMIT 1"
    )
    .get(conversationId) as DbMessageRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as Role,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
