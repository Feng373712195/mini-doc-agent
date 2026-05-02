<template>
  <div class="glass" :style="wrapStyle">
    <a-input-text-area
      data-testid="composer-input"
      v-model:value="draft"
      :auto-size="{ minRows: 1, maxRows: 6 }"
      placeholder="Ask anything about your docs..."
      @keydown.enter.exact.prevent="onSend"
    />
    <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }">
      <span class="muted">Enter 发送，Shift+Enter 换行</span>
      <div :style="{ display: 'flex', gap: '8px' }">
        <a-button v-if="streaming" danger @click="$emit('stop')">Stop</a-button>
        <a-button data-testid="send-button" type="primary" :loading="sending" @click="onSend">Send</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{ sending: boolean; streaming: boolean }>();
const emit = defineEmits<{ (e: "send", content: string): void; (e: "stop"): void }>();

const draft = ref("");

function onSend() {
  const content = draft.value.trim();
  if (!content) return;
  emit("send", content);
  draft.value = "";
}

const wrapStyle = {
  padding: "12px 12px",
  borderRadius: "16px",
};
</script>
