<template>
  <div class="max-w-3xl mx-auto w-full">
    <div class="composer-container">
      <a-textarea
        data-testid="composer-input"
        v-model:value="draft"
        :auto-size="{ minRows: 1, maxRows: 6 }"
        placeholder="请输入你的问题（例如：React 中 useEffect 有什么作用？）"
        :bordered="false"
        @keydown.enter.exact.prevent="onSend"
        class="composer-textarea"
      />
      <div class="flex justify-between items-center px-3 py-2 border-t border-border-default">
        <span class="text-xs text-muted">Enter 发送，Shift+Enter 换行</span>
        <div class="flex gap-2">
          <a-button 
            v-if="streaming" 
            danger 
            @click="$emit('stop')"
            class="h-9 px-4 text-sm rounded-lg"
          >
            停止
          </a-button>
          <a-button 
            data-testid="send-button" 
            type="primary" 
            :loading="sending" 
            @click="onSend"
            class="btn-primary"
          >
            发送
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

// 发送状态（按钮 loading）与流式状态（显示"停止"按钮）
defineProps<{ sending: boolean; streaming: boolean }>();
const emit = defineEmits<{ (e: "send", content: string): void; (e: "stop"): void }>();

const draft = ref("");

/**
 * 发送当前输入框内容（会 trim），发送后清空输入框。
 */
function onSend() {
  const content = draft.value.trim();
  if (!content) return;
  emit("send", content);
  draft.value = "";
}
</script>

<style scoped>
.composer-container {
  background: var(--surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-default);
  transition: all 150ms ease;
}

.composer-container:hover {
  border-color: var(--border-hover);
}

.composer-container:focus-within {
  border-color: var(--primary-navy);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08), var(--shadow-default);
}

.composer-textarea {
  font-size: 16px;
  line-height: 1.6;
  padding: 12px 16px;
  resize: none;
}

.btn-primary {
  height: 36px;
  padding: 0 20px;
  font-size: 14px;
  border-radius: var(--radius-default);
  background: var(--primary-navy);
  border-color: var(--primary-navy);
}
</style>
