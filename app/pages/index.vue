<template>
  <a-layout class="main-layout">
    <a-layout-sider
      width="280"
      :collapsed-width="72"
      collapsible
      v-model:collapsed="collapsed"
      class="sidebar"
      :trigger="null"
    >
      <div class="sidebar-header">
        <div v-if="!collapsed" class="sidebar-title">RepoMind</div>

        <div class="sidebar-actions">
          <a-button
            data-testid="new-chat"
            type="primary"
            block
            @click="onNewChat"
            class="btn-new-chat"
          >
            新对话
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

      <div class="conversation-list">
        <a-list
          :data-source="filteredConversations"
          size="small"
          :split="false"
        >
          <template #renderItem="{ item }">
            <a-list-item
              :class="[
                'conversation-item',
                { active: item.id === activeConversationId },
              ]"
              @click="selectConversation(item.id)"
            >
              <div class="conversation-item-content">
                <div class="conversation-title">{{ item.title }}</div>
                <div class="conversation-time">
                  {{ formatTime(item.updatedAt) }}
                </div>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </div>

      <div class="sidebar-trigger" @click="collapsed = !collapsed">
        <svg
          class="sidebar-trigger-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path v-if="!collapsed" d="M15 18l-6-6 6-6" />
          <path v-else d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </a-layout-sider>

    <a-layout class="main-layout-content">
      <a-layout-header class="main-header">
        <div class="main-header-title">
          {{ activeTitle || "Chat" }}
        </div>
        <a-button
          v-if="!follow"
          @click="scrollToBottom"
          class="btn-back-to-bottom"
        >
          返回顶部
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
          class="message-list-container"
        />
        <Composer
          :sending="sending"
          :streaming="streaming"
          @send="sendMessage"
          @stop="stopStream"
          class="composer-container"
        />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef } from "vue";
import type { Conversation, Message } from "~~/shared/chat";

/**
 * Chat 主页面
 * - 左侧边栏：会话列表、新建会话、搜索
 * - 右侧主区域：消息列表 + 输入框
 * - SSE 流式接收 AI 回复
 */
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
  getScrollMetrics: () => {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  };
  setScrollTop: (value: number) => void;
} | null>(null);

/**
 * 当前激活会话的标题
 */
const activeTitle = computed(() => {
  const id = activeConversationId.value;
  if (!id) return "";
  return (
    conversations.value.find((c: Conversation) => c.id === id)?.title || ""
  );
});

/**
 * 根据搜索关键词过滤会话列表
 */
const filteredConversations = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return conversations.value;
  return conversations.value.filter((c: Conversation) =>
    c.title.toLowerCase().includes(q),
  );
});

function formatTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleString();
}

/**
 * 从服务器刷新会话列表，并自动选中第一个
 */
async function refreshConversations() {
  try {
    conversations.value = await $fetch<Conversation[]>("/api/conversations");
    if (!activeConversationId.value && conversations.value.length) {
      const first = conversations.value[0];
      if (first) await selectConversation(first.id);
    }
  } catch (error) {
    console.error("[refreshConversations] Failed:", error);
  }
}

/**
 * 选中指定会话，加载最新一页消息
 */
async function selectConversation(id: string) {
  stopStream();
  activeConversationId.value = id;
  // Load newest page only; older pages are fetched on-demand.
  const page = await $fetch<Message[]>(
    `/api/conversations/${id}/messages?limit=50`,
  );
  messages.value = page;
  hasMoreOlder.value = page.length >= 50;
  await nextTick();
  scrollToBottom();
}

/**
 * 创建新会话并切换到该会话
 */
async function onNewChat() {
  stopStream();
  const convo = await $fetch<Conversation>("/api/conversations", {
    method: "POST",
    body: {},
  });
  conversations.value = [convo, ...conversations.value];
  await selectConversation(convo.id);
}

/**
 * 滚动到底部并启用 follow 模式
 */
function scrollToBottom() {
  follow.value = true;
  listRef.value?.scrollToBottom();
}

/**
 * 关闭 SSE 连接，清除流式状态
 */
function stopStream() {
  streamSource.value?.close();
  streamSource.value = null;
  streaming.value = false;
}

/**
 * 确保存在一个激活的会话 ID，若无则创建新会话
 */
async function ensureConversation(): Promise<string> {
  if (activeConversationId.value) return activeConversationId.value;
  const convo = await $fetch<Conversation>("/api/conversations", {
    method: "POST",
    body: {},
  });
  conversations.value = [convo, ...conversations.value];
  activeConversationId.value = convo.id;
  messages.value = [];
  return convo.id;
}

/**
 * 发送消息：创建用户消息和助手消息占位，通过 SSE 流式接收助手回复
 */
async function sendMessage(content: string) {
  if (sending.value) return;
  sending.value = true;
  stopStream();

  try {
    const conversationId = await ensureConversation();

    const { userMessageId, assistantMessageId } = await $fetch<{
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
      isLoading: true,
      createdAt: ts + 1,
      updatedAt: ts + 1,
    });
    await nextTick();
    scrollToBottom();

    streaming.value = true;
    const es = new EventSource(
      `/api/conversations/${conversationId}/stream?assistantMessageId=${encodeURIComponent(assistantMessageId)}`,
    );
    streamSource.value = es;

    es.addEventListener("message_start", (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        const idx = conversations.value.findIndex(
          (c: Conversation) => c.id === conversationId,
        );
        const row = idx >= 0 ? conversations.value[idx] : undefined;
        if (row && row.title === "New chat") row.title = content.slice(0, 32);
      } catch {
        // ignore
      }
    });

    es.addEventListener("delta", (evt: MessageEvent) => {
      const data = JSON.parse(evt.data) as { text: string };
      const msg = messages.value.find(
        (m: Message) => m.id === assistantMessageId,
      );
      if (msg) {
        msg.content += data.text;
        msg.isLoading = false;
      }
    });

    es.addEventListener("message_end", async () => {
      streaming.value = false;
      const msg = messages.value.find(
        (m: Message) => m.id === assistantMessageId,
      );
      if (msg) msg.isLoading = false;
      es.close();
      streamSource.value = null;
      await refreshConversations();
    });

    es.addEventListener("error", async () => {
      streaming.value = false;
      const msg = messages.value.find(
        (m: Message) => m.id === assistantMessageId,
      );
      if (msg) msg.isLoading = false;
      es.close();
      streamSource.value = null;
      // Pull latest persisted messages to recover.
      const page = await $fetch<Message[]>(
        `/api/conversations/${conversationId}/messages?limit=50`,
      );
      messages.value = page;
      hasMoreOlder.value = page.length >= 50;
    });
  } finally {
    sending.value = false;
  }
}

/**
 * 分页加载更早消息：每次加载 50 条，前插到消息列表头部
 * 加载后补偿滚动位置，避免视口跳动
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

    const older = await $fetch<Message[]>(
      `/api/conversations/${conversationId}/messages?limit=50&before=${encodeURIComponent(String(before))}`,
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

<style lang="less" scoped>
/* Main Layout */
.main-layout {
  height: 100%;

  :deep(.ant-layout) {
    height: 100%;
  }
}

.main-layout-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Sidebar */
.sidebar {
  background: @surface;
  border-right: 1px solid @border-default;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;

  :deep(.ant-list) {
    background: transparent;
  }
}

.sidebar-header {
  padding: @space-lg;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: @space-lg;
  font-family: "Plus Jakarta Sans", sans-serif;
  color: @text-primary;
}

.sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: @space-sm;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 @space-sm @space-md;
}

/* Conversation item */
.conversation-item {
  border-radius: @radius-default;
  margin: @space-xs 0;
  padding: @space-sm @space-md;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  transition: all 150ms ease;

  &:hover {
    background: rgba(15, 23, 42, 0.03);
  }

  &.active {
    border-color: @primary-navy;
    background: rgba(15, 23, 42, 0.06);
  }
}

.conversation-item-content {
  width: 100%;
}

.conversation-title {
  font-weight: 500;
  font-size: 14px;
  color: @text-primary;
  margin-bottom: @space-xs;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-time {
  font-size: 12px;
  color: @text-muted;
}

/* Main header */
.main-header {
  background: @surface;
  border-bottom: 1px solid @border-default;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 @space-lg;
  height: 64px;
  flex-shrink: 0;
}

.main-header-title {
  font-size: 16px;
  font-weight: 600;
  font-family: "Plus Jakarta Sans", sans-serif;
  color: @text-primary;
}

/* Main Content - 关键修复：使用 Flexbox 三段式布局 */
.main-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: @space-lg;
  gap: @space-lg;
  background: @background;
  overflow: hidden;
}

.message-list-container {
  flex: 1;
  min-height: 0;
}

.composer-container {
  flex-shrink: 0;
}

/* Buttons */
.btn-new-chat {
  height: 42px;
  font-size: 14px;
  font-weight: 500;
  border-radius: @radius-default;
  background: @primary-navy;
  border-color: @primary-navy;
}

.input-search {
  height: 42px;
  border-radius: @radius-default;
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
  background: @surface;
  border: 1px solid @border-default;
  border-radius: @radius-default;
  cursor: pointer;
  transition: all 150ms ease;
  z-index: 10;
  color: @text-primary;

  &:hover {
    background: @background;
    border-color: @border-hover;
  }
}

.sidebar-trigger-icon {
  width: 16px;
  height: 16px;
}

.btn-back-to-bottom {
  height: 36px;
  font-size: 14px;
  border-radius: @radius-default;
}
</style>
