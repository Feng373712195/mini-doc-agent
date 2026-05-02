<template>
  <div class="composer-wrapper">
    <div class="composer-container">
      <a-textarea
        data-testid="composer-input"
        v-model:value="draft"
        :auto-size="{ minRows: 1, maxRows: 6 }"
        placeholder="请输入你的问题（例如：React 中 useEffect 有什么作用？）"
        :bordered="false"
        @keydown.enter.exact.prevent="onSend"
        :style="{
          fontSize: '16px',
          lineHeight: '1.6',
          padding: '12px 16px',
          resize: 'none',
        }"
      />
      <div :style="{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '8px 12px',
        borderTop: '1px solid var(--border-default)',
      }">
        <span class="text-muted" :style="{ fontSize: '12px' }">Enter 发送，Shift+Enter 换行</span>
        <div :style="{ display: 'flex', gap: '8px' }">
          <a-button 
            v-if="streaming" 
            danger 
            @click="$emit('stop')"
            :style="{ 
              height: '36px',
              padding: '0 16px',
              fontSize: '14px',
              borderRadius: 'var(--radius-default)',
            }"
          >
            停止
          </a-button>
          <a-button 
            data-testid="send-button" 
            type="primary" 
            :loading="sending" 
            @click="onSend"
            :style="{ 
              height: '36px',
              padding: '0 20px',
              fontSize: '14px',
              borderRadius: 'var(--radius-default)',
              background: 'var(--primary-navy)',
              borderColor: 'var(--primary-navy)',
            }"
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
