<template>
  <div :style="{ display: 'flex', justifyContent: role === 'user' ? 'flex-end' : 'flex-start' }">
    <div
      class="chat-bubble"
      :class="role === 'user' ? 'bubble-user' : 'bubble-assistant'"
      :style="{ maxWidth: '820px', width: 'fit-content' }"
    >
      <MarkdownRender v-if="role !== 'user'" :content="content" />
      <div v-else>{{ content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Role } from "~/shared/chat";

defineProps<{ role: Role; content: string }>();
</script>

