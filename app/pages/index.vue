<template>
  <a-layout class="h-full">
    <a-layout-sider
      width="280"
      :collapsed-width="72"
      collapsible
      v-model:collapsed="collapsed"
      class="sidebar"
      :trigger="null"
    >
      <div class="p-6">
        <div v-if="!collapsed" class="sidebar-title">
          Mini Doc Agent
        </div>

        <div class="grid gap-2">
          <a-button 
            data-testid="new-chat" 
            type="primary" 
            block 
            @click="onNewChat"
            class="btn-new-chat"
          >
            New chat
          </a-button>
          <a-input 
            v-if="!collapsed" 
            v-model:value="search" 
            placeholder="Search chats" 
            allow-clear
            class="input-search"
          />
        </div>
      </div>

      <div class="px-2 pb-3">
        <a-list
          :data-source="filteredConversations"
          size="small"
          :split="false"
        >
          <template #renderItem="{ item }">
            <a-list-item
              :class="['conversation-item', { active: item.id === activeConversationId }]"
              @click="selectConversation(item.id)"
            >
              <div class="w-full">
                <div class="conversation-title">{{ item.title }}</div>
                <div class="conversation-time">{{ formatTime(item.updatedAt) }}</div>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </div>

      <div 
        class="sidebar-trigger" 
        @click="collapsed = !collapsed"
        v-if="!collapsed"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </div>
      <div 
        class="sidebar-trigger" 
        @click="collapsed = !collapsed"
        v-else
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </a-layout-sider>

    <a-layout class="flex flex-col">
      <a-layout-header class="main-header">
        <div class="main-header-title">
          {{ activeTitle || "Chat" }}
        </div>
        <a-button 
          v-if="!follow" 
          @click="scrollToBottom"
          class="h-9 text-sm rounded-lg"
        >
          Back to bottom
        </a-button>
      </a-layout-header>

      <a-layout-content class="main-content">
        <MessageList
          ref="listRef"
          data-testid="message-list"
          :messages="messages"
          :follow="follow"
          :loadingOlder="loadingOlder"
          :hasMoreOlder="hasMoreOlder"
          @followChange="follow = $event"
          @loadOlder="loadOlder"
          class="flex-grow min-h-0"
        />
        <Composer 
          :sending="sending" 
          :streaming="streaming" 
          @send="sendMessage" 
          @stop="stopStream" 
          class="flex-shrink-0"
        />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef } from "vue";
import { ofetch } from "ofetch";
import type { Conversation, Message } from "~/shared/chat";

const collapsed = ref(false);
const search = ref("");
const follow = ref(true);

const conversations = ref<Conversation[]>([]);
const activeConversationId = ref<string | null>(null);
const messages = ref<Message[]>([]);

const sending = ref(false);
const streaming = ref(false);
const streamSource = shallowRef<EventSource | null>(null);

const loadingOlder = ref(false);
const hasMoreOlder = ref(false);

const listRef = ref<{
  scrollToBottom: () => void;
  getScrollMetrics: () => { scrollTop: number; scrollHeight: number; clientHeight: number };
  setScrollTop: (value: number) => void;
} | null>(null);

const activeTitle = computed(() => {
  const id = activeConversationId.value;
  if (!id) return "";
  return conversations.value.find((c: Conversation) => c.id === id)?.title || "";
});

const filteredConversations = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return conversations.value;
  return conversations.value.filter((c: Conversation) => c.title.toLowerCase().includes(q));
});

function formatTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleString();
}

async function refreshConversations() {
  conversations.value = await ofetch<Conversation[]>("/api/conversations");
  if (!activeConversationId.value && conversations.value.length) {
    const first = conversations.value[0];
    if (first) await selectConversation(first.id);
  }
}

async function selectConversation(id: string) {
  stopStream();
  activeConversationId.value = id;
  // Load newest page only; older pages are fetched on-demand.
  const page = await ofetch<Message[]>(`/api/conversations/${id}/messages?limit=50`);
  messages.value = page;
  hasMoreOlder.value = page.length >= 50;
  await nextTick();
  scrollToBottom();
}

async function onNewChat() {
  stopStream();
  const convo = await ofetch<Conversation>("/api/conversations", { method: "POST", body: {} });
  conversations.value = [convo, ...conversations.value];
  await selectConversation(convo.id);
}

function scrollToBottom() {
  follow.value = true;
  listRef.value?.scrollToBottom();
}

function stopStream() {
  streamSource.value?.close();
  streamSource.value = null;
  streaming.value = false;
}

async function ensureConversation(): Promise<string> {
  if (activeConversationId.value) return activeConversationId.value;
  const convo = await ofetch<Conversation>("/api/conversations", { method: "POST", body: {} });
  conversations.value = [convo, ...conversations.value];
  activeConversationId.value = convo.id;
  messages.value = [];
  return convo.id;
}

async function sendMessage(content: string) {
  if (sending.value) return;
  sending.value = true;
  stopStream();

  try {
    const conversationId = await ensureConversation();

    const { userMessageId, assistantMessageId } = await ofetch<{
      userMessageId: string;
      assistantMessageId: string;
    }>(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: { content },
    });

    // Optimistic render: append user + assistant placeholder.
    const ts = Date.now();
    messages.value.push({
      id: userMessageId,
      conversationId,
      role: "user",
      content,
      createdAt: ts,
      updatedAt: ts,
    });
    messages.value.push({
      id: assistantMessageId,
      conversationId,
      role: "assistant",
      content: "",
      createdAt: ts + 1,
      updatedAt: ts + 1,
    });
    await nextTick();
    scrollToBottom();

    streaming.value = true;
    const es = new EventSource(
      `/api/conversations/${conversationId}/stream?assistantMessageId=${encodeURIComponent(assistantMessageId)}`
    );
    streamSource.value = es;

    es.addEventListener("message_start", (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        // Update title based on first message.
        const idx = conversations.value.findIndex((c: Conversation) => c.id === conversationId);
        const row = idx >= 0 ? conversations.value[idx] : undefined;
        if (row && row.title === "New chat") row.title = content.slice(0, 32);
      } catch {
        // ignore
      }
    });

    es.addEventListener("delta", (evt: MessageEvent) => {
      const data = JSON.parse(evt.data) as { text: string };
      const msg = messages.value.find((m: Message) => m.id === assistantMessageId);
      if (msg) msg.content += data.text;
    });

    es.addEventListener("message_end", async () => {
      streaming.value = false;
      es.close();
      streamSource.value = null;
      await refreshConversations();
    });

    es.addEventListener("error", async () => {
      streaming.value = false;
      es.close();
      streamSource.value = null;
      // Pull latest persisted messages to recover.
      const page = await ofetch<Message[]>(`/api/conversations/${conversationId}/messages?limit=50`);
      messages.value = page;
      hasMoreOlder.value = page.length >= 50;
    });
  } finally {
    sending.value = false;
  }
}

/**
 * Load older messages in pages of 50 and prepend them while keeping the viewport stable.
 */
async function loadOlder() {
  if (loadingOlder.value) return;
  if (!hasMoreOlder.value) return;
  const conversationId = activeConversationId.value;
  if (!conversationId) return;

  const first = messages.value[0];
  if (!first) return;

  loadingOlder.value = true;
  follow.value = false; // user is browsing history

  try {
    const before = first.createdAt;
    const metrics = listRef.value?.getScrollMetrics();
    const prevScrollTop = metrics?.scrollTop ?? 0;
    const prevScrollHeight = metrics?.scrollHeight ?? 0;

    const older = await ofetch<Message[]>(
      `/api/conversations/${conversationId}/messages?limit=50&before=${encodeURIComponent(String(before))}`
    );

    if (older.length === 0) {
      hasMoreOlder.value = false;
      return;
    }

    messages.value = [...older, ...messages.value];
    if (older.length < 50) hasMoreOlder.value = false;

    await nextTick();

    const metrics2 = listRef.value?.getScrollMetrics();
    const newScrollHeight = metrics2?.scrollHeight ?? prevScrollHeight;
    const delta = newScrollHeight - prevScrollHeight;
    listRef.value?.setScrollTop(prevScrollTop + delta);
  } finally {
    loadingOlder.value = false;
  }
}

onMounted(async () => {
  await refreshConversations();
});
</script>

<style scoped>
/* Sidebar */
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border-default);
}

.sidebar-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: var(--space-lg);
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: var(--text-primary);
}

.sidebar :deep(.ant-list) {
  background: transparent;
}

/* Conversation item */
.conversation-item {
  border-radius: var(--radius-default);
  margin: var(--space-xs) 0;
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  transition: all 150ms ease;
}

.conversation-item:hover {
  background: rgba(15, 23, 42, 0.03);
}

.conversation-item.active {
  border-color: var(--primary-navy);
  background: rgba(15, 23, 42, 0.06);
}

.conversation-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.conversation-time {
  font-size: 12px;
  color: var(--text-muted);
}

/* Main header */
.main-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  height: 64px;
  flex-shrink: 0;
}

.main-header-title {
  font-size: 16px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: var(--text-primary);
}

/* Main content */
.main-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  padding: var(--space-lg);
  gap: var(--space-lg);
  background: var(--background);
}

/* Buttons */
.btn-new-chat {
  height: 42px;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-default);
  background: var(--primary-navy);
  border-color: var(--primary-navy);
}

.input-search {
  height: 42px;
  border-radius: var(--radius-default);
}

/* Sidebar trigger */
.sidebar-trigger {
  position: absolute;
  top: 16px;
  right: -40px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
  cursor: pointer;
  transition: all 150ms ease;
  z-index: 10;
  color: var(--text-primary);
}

.sidebar-trigger:hover {
  background: var(--background);
  border-color: var(--border-hover);
}
</style>
