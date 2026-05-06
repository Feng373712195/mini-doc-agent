<template>
  <div class="msg-md" v-html="html" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

/**
 * Markdown 渲染组件
 * - 将 Markdown 文本渲染为 HTML
 * - 支持代码高亮（highlight.js）
 * - 支持链接识别和换行转换
 */
const props = defineProps<{ content: string }>();

// MarkdownIt 实例：配置链接识别、自动换行、代码高亮
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

// 渲染后的 HTML，通过 v-html 绑定到模板
const html = computed(() => md.render(props.content || ""));
</script>
