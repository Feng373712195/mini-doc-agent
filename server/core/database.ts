import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import type { Conversation, Message, Role } from "~~/shared/chat";

let dbSingleton: Database.Database | null = null;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getDbPath() {
  const dataDir = path.resolve(String(process.env.DATA_DIR || "data"));
  ensureDir(dataDir);
  return path.join(dataDir, "chat.db");
}

export function getDb() {
  if (dbSingleton) return dbSingleton;
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
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
  `);
  dbSingleton = db;
  return dbSingleton;
}

export function nowMs() {
  return Date.now();
}

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

export function listConversations(limit = 50, offset = 0): Conversation[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, title, created_at as createdAt, updated_at as updatedAt FROM conversations ORDER BY updated_at DESC LIMIT ? OFFSET ?"
    )
    .all(limit, offset) as Conversation[];
  return rows;
}

export function touchConversation(conversationId: string) {
  const db = getDb();
  db.prepare("UPDATE conversations SET updated_at=? WHERE id=?").run(nowMs(), conversationId);
}

export function setConversationTitle(conversationId: string, title: string) {
  const db = getDb();
  db.prepare("UPDATE conversations SET title=?, updated_at=? WHERE id=?").run(
    title.slice(0, 80),
    nowMs(),
    conversationId
  );
}

export function getMessages(conversationId: string): Message[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, conversation_id as conversationId, role, content, created_at as createdAt, updated_at as updatedAt FROM messages WHERE conversation_id=? ORDER BY created_at ASC"
    )
    .all(conversationId) as Message[];
  return rows;
}

/**
 * Get a page of messages for a conversation.
 *
 * - Default: newest messages first (DESC), but returned in ASC order for UI rendering.
 * - Use `beforeCreatedAt` to fetch older messages (created_at < beforeCreatedAt).
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
          "SELECT id, conversation_id as conversationId, role, content, created_at as createdAt, updated_at as updatedAt FROM messages WHERE conversation_id=? AND created_at < ? ORDER BY created_at DESC LIMIT ?"
        )
        .all(params.conversationId, beforeCreatedAt, limit) as Message[])
    : (db
        .prepare(
          "SELECT id, conversation_id as conversationId, role, content, created_at as createdAt, updated_at as updatedAt FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT ?"
        )
        .all(params.conversationId, limit) as Message[]);

  // We query in DESC for efficiency and then reverse so UI renders in ASC.
  return rows.reverse();
}

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

export function updateMessageContent(messageId: string, content: string) {
  const db = getDb();
  db.prepare("UPDATE messages SET content=?, updated_at=? WHERE id=?").run(content, nowMs(), messageId);
}

export function getLatestUserMessage(conversationId: string): Message | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, conversation_id as conversationId, role, content, created_at as createdAt, updated_at as updatedAt FROM messages WHERE conversation_id=? AND role='user' ORDER BY created_at DESC LIMIT 1"
    )
    .get(conversationId) as Message | undefined;
  return row || null;
}
