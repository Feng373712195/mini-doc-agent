<template>
  <div class="flex" :class="role === 'user' ? 'justify-end' : 'justify-start'">
    <div class="chat-bubble max-w-4xl w-fit" :class="role === 'user' ? 'bubble-user' : 'bubble-assistant'">
      <MarkdownRender v-if="role !== 'user'" :content="content" />
      <div v-else>{{ content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Role } from "~/shared/chat";

defineProps<{ role: Role; content: string }>();
</script>
