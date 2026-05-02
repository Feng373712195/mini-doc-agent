<template>
  <div class="message-bubble-wrapper" :class="role === 'user' ? 'user' : 'assistant'">
    <div class="chat-bubble" :class="role === 'user' ? 'bubble-user' : 'bubble-assistant'">
      <MarkdownRender v-if="role !== 'user'" :content="content" />
      <div v-else>{{ content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Role } from "~/shared/chat";

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
