import { ref } from "vue";
import type { Message } from "~~/shared/chat";

export function useMessages() {
  const messages = ref<Message[]>([]);
  const hasMoreOlder = ref(false);
  const loadingOlder = ref(false);

  /**
   * 加载会话的最新消息页面
   */
  async function loadMessages(conversationId: string) {
    const page = await $fetch<Message[]>(
      `/api/conversations/${conversationId}/messages?limit=50`,
    );
    messages.value = page;
    hasMoreOlder.value = page.length >= 50;
    return page;
  }

  /**
   * 加载更早的消息（分页）
   */
  async function loadOlderMessages(conversationId: string) {
    if (loadingOlder.value) return [];
    if (!hasMoreOlder.value) return [];

    const first = messages.value[0];
    if (!first) return [];

    loadingOlder.value = true;
    try {
      const before = first.createdAt;
      const older = await $fetch<Message[]>(
        `/api/conversations/${conversationId}/messages?limit=50&before=${encodeURIComponent(String(before))}`,
      );

      if (older.length === 0) {
        hasMoreOlder.value = false;
        return [];
      }

      messages.value = [...older, ...messages.value];
      if (older.length < 50) hasMoreOlder.value = false;

      return older;
    } finally {
      loadingOlder.value = false;
    }
  }

  /**
   * 重置消息列表
   */
  function resetMessages() {
    messages.value = [];
    hasMoreOlder.value = false;
    loadingOlder.value = false;
  }

  return {
    messages,
    hasMoreOlder,
    loadingOlder,
    loadMessages,
    loadOlderMessages,
    resetMessages,
  };
}