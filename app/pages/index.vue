<template>
  <a-layout :style="{ height: '100%' }">
    <a-layout-sider
      width="300"
      :collapsed-width="72"
      collapsible
      v-model:collapsed="collapsed"
      class="glass"
      :style="{ borderRight: '1px solid var(--border)' }"
    >
      <div :style="{ padding: '14px 12px' }">
        <div :style="{ display: 'flex', alignItems: 'center', gap: '10px' }">
          <div
            :style="{
              width: '34px',
              height: '34px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            }"
          />
          <div v-if="!collapsed">
            <div :style="{ fontSize: '16px', fontWeight: 700 }">Mini Doc Agent</div>
            <div class="muted" :style="{ fontSize: '12px' }">RAG + Stream</div>
          </div>
        </div>

        <div :style="{ marginTop: '14px', display: 'grid', gap: '10px' }">
          <a-button data-testid="new-chat" type="primary" block @click="onNewChat">New chat</a-button>
          <a-input v-if="!collapsed" v-model:value="search" placeholder="Search chats" allow-clear />
        </div>
      </div>

      <div :style="{ padding: '0 8px 12px' }">
        <a-list
          :data-source="filteredConversations"
          size="small"
          :split="false"
          :style="{ background: 'transparent' }"
        >
          <template #renderItem="{ item }">
            <a-list-item
              :style="{
                borderRadius: '12px',
                margin: '6px 0',
                padding: '10px 10px',
                cursor: 'pointer',
                border: item.id === activeConversationId ? '1px solid rgba(121,166,255,0.6)' : '1px solid transparent',
                background: item.id === activeConversationId ? 'rgba(121,166,255,0.10)' : 'transparent',
              }"
              @click="selectConversation(item.id)"
            >
              <div :style="{ width: '100%' }">
                <div :style="{ fontWeight: 600, fontSize: '13px' }">{{ item.title }}</div>
                <div class="muted" :style="{ fontSize: '12px', marginTop: '2px' }">
                  {{ formatTime(item.updatedAt) }}
                </div>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </div>
    </a-layout-sider>

    <a-layout>
      <a-layout-header
        :style="{
          background: 'transparent',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
        }"
      >
        <div>
          <div :style="{ fontSize: '16px', fontWeight: 700 }">
            {{ activeTitle || "Chat" }}
          </div>
          <div class="muted" :style="{ fontSize: '12px' }">Streaming + Virtualized</div>
        </div>
        <a-button v-if="!follow" @click="scrollToBottom">Back to bottom</a-button>
      </a-layout-header>

      <a-layout-content :style="{ padding: '16px', height: 'calc(100vh - 64px)', display: 'grid', gridTemplateRows: '1fr auto', gap: '12px' }">
        <MessageList
          ref="listRef"
          data-testid="message-list"
          :messages="messages"
          :follow="follow"
          :loadingOlder="loadingOlder"
          :hasMoreOlder="hasMoreOlder"
          @followChange="follow = $event"
          @loadOlder="loadOlder"
        />
        <Composer :sending="sending" :streaming="streaming" @send="sendMessage" @stop="stopStream" />
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
