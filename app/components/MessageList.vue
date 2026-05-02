<template>
  <div ref="parentRef" class="message-list" @scroll="onScroll">
    <div class="message-list-inner">
      <div
        v-for="m in messages"
        :key="m.id"
        class="cv-auto message-item"
      >
        <MessageBubble :role="m.role" :content="m.content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { Message } from "~/shared/chat";

const props = defineProps<{
  messages: Message[];
  follow: boolean;
  loadingOlder?: boolean;
  hasMoreOlder?: boolean;
}>();
const emit = defineEmits<{
  (e: "followChange", value: boolean): void;
  (e: "loadOlder"): void;
}>();

const parentRef = ref<HTMLElement | null>(null);

/**
 * 滚动到列表底部。
 * `smooth` 用于流式输出时的体验；`auto` 用于初始化跳转（不做动画，避免抖动）。
 */
function scrollToBottom(behavior: ScrollBehavior = "auto") {
  const el = parentRef.value;
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior });
}

/**
 * 容器滚动时触发：
 * - 根据"距离底部"的距离，维护 follow（是否自动跟随最新消息）状态
 * - 接近顶部时触发 loadOlder（分页加载更早的消息）
 */
function onScroll() {
  const el = parentRef.value;
  if (!el) return;

  if ((props.hasMoreOlder ?? false) && !(props.loadingOlder ?? false) && el.scrollTop < 120) {
    emit("loadOlder");
  }

  const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
  const atBottom = distance < 120;
  if (atBottom && !props.follow) emit("followChange", true);
  if (!atBottom && props.follow) emit("followChange", false);
}

watch(
  () => props.messages.length,
  async () => {
    if (!props.follow) return;
    await nextTick();
    scrollToBottom("smooth");
  }
);

watch(
  () => props.messages.map((m) => m.content).join("\u0000"),
  async () => {
    if (!props.follow) return;
    await nextTick();
    requestAnimationFrame(() => scrollToBottom("smooth"));
  }
);

/**
 * 暴露基础滚动指标，便于父组件在"前插更早消息"后补偿 scrollTop，
 * 避免视口内容突然跳动。
 */
function getScrollMetrics() {
  const el = parentRef.value;
  if (!el) return { scrollTop: 0, scrollHeight: 0, clientHeight: 0 };
  return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
}

function setScrollTop(value: number) {
  const el = parentRef.value;
  if (!el) return;
  el.scrollTop = value;
}

defineExpose({ scrollToBottom, getScrollMetrics, setScrollTop });
</script>

<style lang="less" scoped>
@import "~/assets/styles/app.less";

.message-list {
  height: 100%;
  overflow: auto;
  border-radius: @radius-lg;
  background: transparent;
}

.message-list-inner {
  padding: @space-md;
  box-sizing: border-box;
  max-width: 768px;
  margin: 0 auto;
  width: 100%;
}

.message-item {
  padding: @space-md 0;
}
</style>
