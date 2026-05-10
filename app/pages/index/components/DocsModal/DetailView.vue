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
        {{ sourceTypeMap[doc.sourceType] || doc.sourceType }}
      </a-descriptions-item>
      <a-descriptions-item label="来源">
        {{ doc.sourcePath || "-" }}
      </a-descriptions-item>
      <a-descriptions-item label="分支">
        {{ doc.branch || "-" }}
      </a-descriptions-item>
      <a-descriptions-item label="状态">
        {{ statusMap[doc.status] || doc.status }}
      </a-descriptions-item>
      <a-descriptions-item label="当前阶段">
        {{ stageMap[doc.currentStage as string] || doc.currentStage || "-" }}
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
      <a-descriptions-item v-if="doc.status === 'failed' && doc.errorMessage" label="错误信息">
        <a-alert :message="doc.errorMessage" type="error" show-icon />
      </a-descriptions-item>
    </a-descriptions>
  </a-modal>
</template>

<script setup lang="ts">
import type { DocumentRecord } from "shared/document";

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

const statusMap: Record<string, string> = {
  uploading: "上传中",
  processing: "处理中",
  active: "使用中",
  failed: "失败",
  inactive: "停用",
  deleting: "删除中",
};

const sourceTypeMap: Record<string, string> = {
  github: "GitHub",
  pdf: "PDF",
  word: "Word",
};

const stageMap: Record<string, string> = {
  queued: "排队中",
  parsing: "解析中",
  chunking: "分块中",
  embedding: "嵌入中",
  indexing: "索引中",
  completed: "已完成",
  failed: "已失败",
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function onClose() {
  visible.value = false;
}
</script>
