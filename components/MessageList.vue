<template>
  <div ref="parentRef" class="glass" :style="containerStyle" @scroll="onScroll">
    <div :style="{ padding: '10px 14px', boxSizing: 'border-box' }">
      <div
        v-for="m in messages"
        :key="m.id"
        class="cv-auto"
        :style="{ padding: '10px 0' }"
      >
        <MessageBubble :role="m.role" :content="m.content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { Message } from "~/shared/chat";

const props = defineProps<{ messages: Message[]; follow: boolean }>();
const emit = defineEmits<{ (e: "followChange", value: boolean): void }>();

const parentRef = ref<HTMLElement | null>(null);

function scrollToBottom(behavior: ScrollBehavior = "auto") {
  const el = parentRef.value;
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior });
}

function onScroll() {
  const el = parentRef.value;
  if (!el) return;
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

defineExpose({ scrollToBottom });

const containerStyle = computed(() => ({
  height: "100%",
  overflow: "auto",
  borderRadius: "16px",
}));
</script>

