<template>
  <a-modal
    v-model:open="visible"
    title="文档详情"
    :footer="null"
    :width="520"
    @cancel="onClose"
  >
    <a-descriptions v-if="doc" :column="1" bordered>
      <a-descriptions-item label="文档ID">
        {{ doc.documentId }}
      </a-descriptions-item>
      <a-descriptions-item label="文档名称">
        {{ doc.title }}
      </a-descriptions-item>
      <a-descriptions-item label="类型">
        {{ DOCUMENT_SOURCE_TYPE_LABELS[doc.sourceType] || doc.sourceType }}
      </a-descriptions-item>
      <a-descriptions-item label="来源">
        {{ doc.sourcePath || "-" }}
      </a-descriptions-item>
      <a-descriptions-item label="分支">
        {{ doc.branch || "-" }}
      </a-descriptions-item>
      <a-descriptions-item label="状态">
        {{ DOCUMENT_STATUS_LABELS[doc.status] || doc.status }}
      </a-descriptions-item>
      <a-descriptions-item label="当前阶段">
        {{ doc.currentStage ? (DOCUMENT_STAGE_LABELS[doc.currentStage] || doc.currentStage) : "-" }}
      </a-descriptions-item>
      <a-descriptions-item label="块数量">
        {{ doc.chunkCount ?? "-" }}
      </a-descriptions-item>
      <a-descriptions-item label="版本">
        {{ doc.version || "-" }}
      </a-descriptions-item>
      <a-descriptions-item label="创建时间">
        {{ formatTime(doc.createdAt) }}
      </a-descriptions-item>
      <a-descriptions-item label="最后更新">
        {{ formatTime(doc.updatedAt) }}
      </a-descriptions-item>
      <a-descriptions-item label="最后摄入">
        {{ doc.lastIngestedAt ? formatTime(doc.lastIngestedAt) : "-" }}
      </a-descriptions-item>
      <a-descriptions-item
        v-if="doc.status === 'failed' && doc.errorMessage"
        label="错误信息"
      >
        <a-alert :message="doc.errorMessage" type="error" show-icon />
      </a-descriptions-item>
    </a-descriptions>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DocumentRecord } from "~~/shared/document";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_SOURCE_TYPE_LABELS,
  DOCUMENT_STAGE_LABELS,
} from "~~/shared/constants/document";

const props = defineProps<{
  visible: boolean;
  doc: DocumentRecord | null;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
}>();

const visible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function onClose() {
  visible.value = false;
}
</script>
