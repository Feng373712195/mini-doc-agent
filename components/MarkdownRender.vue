<template>
  <div class="msg-md" v-html="html" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

const props = defineProps<{ content: string }>();

const md = new MarkdownIt({
  linkify: true,
  breaks: true,
  highlight(code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch {
        // fall through
      }
    }
    return hljs.highlightAuto(code).value;
  },
});

const html = computed(() => md.render(props.content || ""));
</script>
