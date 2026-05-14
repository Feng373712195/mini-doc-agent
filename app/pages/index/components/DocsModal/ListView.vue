<template>
  <div class="list-view">
    <a-table
      :columns="columns"
      :data-source="tableData"
      :pagination="paginationConfig"
      :loading="loading"
      :scroll="{ y: 320 }"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <div class="action-buttons">
            <a-button
              type="link"
              size="small"
              :disabled="isBusy(record.statusRaw)"
              @click="handleToggleStatus(record)"
            >
              {{ record.statusRaw === "active" ? "停用" : "启用" }}
            </a-button>
            <a-button type="link" size="small" @click="showDetail(record)">
              详情
            </a-button>
            <a-dropdown :disabled="isBusy(record.statusRaw)">
              <a-button type="link" size="small">
                更多
                <DownOutlined />
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="refresh" @click="handleRefresh(record)">
                    更新
                  </a-menu-item>
                  <a-menu-item key="delete" @click="handleDelete(record)">
                    删除
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </template>
      </template>
    </a-table>

    <DetailView v-model:visible="detailModalVisible" :doc="selectedDoc" />

    <a-modal
      v-model:open="deleteModalVisible"
      title="确认删除"
      @ok="deleteDocument"
      :confirmLoading="actionLoading"
    >
      <p>
        确认删除【{{
          deleteTarget?.title
        }}】该文档吗？删除后将同时移除相关索引数据，且不可恢复。
      </p>
    </a-modal>

    <a-modal
      v-model:open="refreshModalVisible"
      title="确认更新"
      @ok="refreshDocument"
      :confirmLoading="actionLoading"
    >
      <p>
        确认更新【{{
          refreshTarget?.title
        }}】该文档吗？系统将覆盖当前内容并重建索引，过程中文档状态会变为处理中。
      </p>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { DownOutlined } from "@ant-design/icons-vue";
import DetailView from "./DetailView.vue";
import type { DocumentRecord, DocumentSourceType } from "~~/shared/document";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_SOURCE_TYPE_LABELS,
} from "~~/shared/constants/document";
import { formatDateTime } from "~~/app/utils/date";
import { useDocumentList } from "./composables/useDocumentList";
import { useDocumentActions } from "./composables/useDocumentActions";

const emit = defineEmits<{
  "need-reupload": [
    documentId: string,
    sourceType: DocumentSourceType,
    title: string,
  ];
}>();

const columns = [
  {
    title: "文档名称",
    dataIndex: "title",
    key: "title",
    ellipsis: true,
  },
  {
    title: "类型",
    dataIndex: "sourceType",
    key: "sourceType",
    width: 100,
  },
  {
    title: "创建时间",
    dataIndex: "createdAt",
    key: "createdAt",
    width: 160,
  },
  {
    title: "状态",
    dataIndex: "status",
    key: "status",
    width: 100,
  },
  {
    title: "操作",
    key: "action",
    width: 200,
  },
];

// 使用文档列表数据管理 composable
const {
  documents,
  currentPage,
  pageSize,
  total,
  loading,
  fetchDocuments,
  handleTableChange,
  refreshFirstPage,
} = useDocumentList();

// 使用文档操作逻辑 composable
const {
  actionLoading,
  deleteModalVisible,
  refreshModalVisible,
  deleteTarget,
  refreshTarget,
  toggleStatus,
  confirmDelete,
  deleteDocument,
  confirmRefresh,
  refreshDocument,
} = useDocumentActions({
  onRefreshNeeded: fetchDocuments,
  onNeedReupload: (documentId, sourceType, title) => {
    emit("need-reupload", documentId, sourceType, title);
  },
});

const detailModalVisible = ref(false);
const selectedDoc = ref<DocumentRecord | null>(null);

const tableData = computed(() =>
  documents.value.map((doc) => ({
    key: doc.documentId,
    documentId: doc.documentId,
    title: doc.title,
    sourceType: DOCUMENT_SOURCE_TYPE_LABELS[doc.sourceType] || doc.sourceType,
    sourceTypeRaw: doc.sourceType,
    createdAt: formatDateTime(doc.createdAt),
    status: DOCUMENT_STATUS_LABELS[doc.status] || doc.status,
    statusRaw: doc.status,
    sourcePath: doc.sourcePath,
    repo: doc.repo,
    branch: doc.branch,
    currentStage: doc.currentStage,
    chunkCount: doc.chunkCount,
    errorMessage: doc.errorMessage,
    updatedAt: formatDateTime(doc.updatedAt),
    lastIngestedAt: doc.lastIngestedAt ? formatDateTime(doc.lastIngestedAt) : null,
  })),
);

const paginationConfig = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: false,
  position: ["bottomCenter"],
}));

function isBusy(status: string): boolean {
  return ["uploading", "processing", "deleting"].includes(status);
}

/**
 * 处理状态切换（启用/停用）
 */
function handleToggleStatus(record: (typeof tableData.value)[0]): void {
  toggleStatus(record.documentId, record.statusRaw);
}

/**
 * 显示文档详情
 */
function showDetail(record: (typeof tableData.value)[0]): void {
  const originalDoc = documents.value.find(
    (d) => d.documentId === record.documentId,
  );
  if (originalDoc) {
    selectedDoc.value = originalDoc;
    detailModalVisible.value = true;
  }
}

/**
 * 处理删除操作
 */
function handleDelete(record: (typeof tableData.value)[0]): void {
  const doc = documents.value.find((d) => d.documentId === record.documentId);
  if (doc) {
    confirmDelete(doc);
  }
}

/**
 * 处理刷新操作
 */
function handleRefresh(record: (typeof tableData.value)[0]): void {
  const doc = documents.value.find((d) => d.documentId === record.documentId);
  if (doc) {
    confirmRefresh(doc);
  }
}

watch(
  () => documents.value.length,
  () => {
    if (documents.value.length === 0 && total.value > 0) {
      currentPage.value = 1;
      fetchDocuments();
    }
  },
);

// 初始化时加载数据
fetchDocuments();

defineExpose({
  refresh: fetchDocuments,
  refreshFirstPage,
});
</script>

<style lang="less" scoped>
.list-view {
  height: 100%;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;

  :deep(.ant-btn-link) {
    padding: 0 4px;
    height: auto;
  }
}
</style>
