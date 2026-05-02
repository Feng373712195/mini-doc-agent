<template>
  <div class="glass" :style="wrapStyle">
    <!-- ant-design-vue v4 的 TextArea 组件标签是 a-textarea（不是 a-input-text-area） -->
    <a-textarea
      data-testid="composer-input"
      v-model:value="draft"
      :auto-size="{ minRows: 1, maxRows: 6 }"
      placeholder="请输入你的问题（例如：React 中 useEffect 有什么作用？）"
      @keydown.enter.exact.prevent="onSend"
    />
    <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }">
      <span class="muted">Enter 发送，Shift+Enter 换行</span>
      <div :style="{ display: 'flex', gap: '8px' }">
        <a-button v-if="streaming" danger @click="$emit('stop')">停止</a-button>
        <a-button data-testid="send-button" type="primary" :loading="sending" @click="onSend">发送</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

// 发送状态（按钮 loading）与流式状态（显示“停止”按钮）
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

const wrapStyle = {
  padding: "12px 12px",
  borderRadius: "16px",
};
</script>
