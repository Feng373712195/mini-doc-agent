<template>
  <div
    class="message-bubble-wrapper"
    :class="role === 'user' ? 'user' : 'assistant'"
  >
    <div
      class="chat-bubble"
      :class="role === 'user' ? 'bubble-user' : 'bubble-assistant'"
    >
      <div v-if="showSpin" class="loading-spin">
        <a-spin />
      </div>
      <template v-else>
        <MarkdownRender
          v-if="role === 'assistant' && content"
          :content="content"
        />
        <div v-else-if="role === 'user'">{{ content }}</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Role } from "~~/shared/chat";
import MarkdownRender from "./MarkdownRender.vue";

/**
 * 消息气泡组件
 * 根据角色（user/assistant）渲染不同样式的气泡
 * - user: 右对齐，深色背景
 * - assistant: 左对齐，浅色背景，支持 Markdown 渲染
 * - isLoading: 仅对 assistant 角色有效，为 true 时显示 spin 加载指示器
 */
const props = defineProps<{
  role: Role;
  content: string;
  isLoading?: boolean;
}>();

const showSpin = computed(
  () => props.role === "assistant" && props.isLoading && !props.content,
);
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

  .loading-spin {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 120px;
    padding: @space-md;
  }
}
</style>
