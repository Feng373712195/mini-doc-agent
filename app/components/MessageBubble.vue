<template>
  <div
    class="message-bubble-wrapper"
    :class="role === 'user' ? 'user' : 'assistant'"
  >
    <div
      class="chat-bubble"
      :class="role === 'user' ? 'bubble-user' : 'bubble-assistant'"
    >
      <MarkdownRender v-if="role !== 'user'" :content="content" />
      <div v-else>{{ content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Role } from "~~/shared/chat";

/**
 * 消息气泡组件
 * 根据角色（user/assistant）渲染不同样式的气泡
 * - user: 右对齐，深色背景
 * - assistant: 左对齐，浅色背景，支持 Markdown 渲染
 */
defineProps<{ role: Role; content: string }>();
</script>

<style lang="less" scoped>
.message-bubble-wrapper {
  display: flex;

  &.user {
    justify-content: flex-end;
  }

  &.assistant {
    justify-content: flex-start;
  }

  .chat-bubble {
    max-width: 820px;
    width: fit-content;
  }
}
</style>
