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
        class="composer-textarea"
      />
      <div class="composer-footer">
        <span class="composer-hint">Enter 发送，Shift+Enter 换行</span>
        <div class="composer-actions">
          <a-button
            v-if="streaming"
            danger
            @click="$emit('stop')"
            class="btn-stop"
          >
            停止
          </a-button>
          <a-button
            data-testid="send-button"
            type="primary"
            :loading="sending"
            @click="onSend"
            class="btn-send"
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

/**
 * 消息输入组件
 * - 提供文本输入框，支持多行输入
 * - Enter 发送消息，Shift+Enter 换行
 * - 发送时显示 loading 状态，流式响应时显示"停止"按钮
 */
defineProps<{ sending: boolean; streaming: boolean }>();
const emit = defineEmits<{
  (e: "send", content: string): void;
  (e: "stop"): void;
}>();

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

<style lang="less" scoped>
@import "~/assets/styles/app.less";

.composer-wrapper {
  max-width: 768px;
  margin: 0 auto;
  width: 100%;
}

.composer-container {
  background: @surface;
  border: 1px solid @border-default;
  border-radius: @radius-md;
  box-shadow: @shadow-default;
  transition: all 150ms ease;

  &:hover {
    border-color: @border-hover;
  }

  &:focus-within {
    border-color: @primary-navy;
    box-shadow:
      0 0 0 3px rgba(15, 23, 42, 0.08),
      @shadow-default;
  }
}

.composer-textarea {
  font-size: 16px;
  line-height: 1.6;
  padding: 12px 16px;
  resize: none;
}

.composer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: @space-sm @space-md;
  border-top: 1px solid @border-default;
}

.composer-hint {
  font-size: 12px;
  color: @text-muted;
}

.composer-actions {
  display: flex;
  gap: @space-sm;
}

.btn-stop {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  border-radius: @radius-default;
}

.btn-send {
  height: 36px;
  padding: 0 20px;
  font-size: 14px;
  border-radius: @radius-default;
  background: @primary-navy;
  border-color: @primary-navy;
}
</style>
