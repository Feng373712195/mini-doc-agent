<template>
  <div class="bubble-user-wrapper" v-if="role === 'user'">
    <div class="chat-bubble bubble-user">
      {{ content }}
    </div>
  </div>
  <div class="bubble-assistant-wrapper" v-else>
    <div class="chat-bubble bubble-assistant">
      <MarkdownRender :content="content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Role } from "~/shared/chat";

defineProps<{ role: Role; content: string }>();
</script>
