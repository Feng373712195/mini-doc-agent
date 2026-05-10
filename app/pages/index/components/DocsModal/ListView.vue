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
              @click="toggleStatus(record)"
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
                  <a-menu-item key="delete" @click="confirmDelete(record)">
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
      @ok="handleDelete"
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
      @ok="handleRefreshConfirm"
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
import { $fetch } from "ohmyfetch";
import { message } from "ant-design-vue";
import { DownOutlined } from "@ant-design/icons-vue";
import DetailView from "./DetailView.vue";

const emit = defineEmits<{
  "need-reupload": [
    documentId: string,
    sourceType: "github" | "pdf" | "word",
    title: string,
  ];
}>();

interface DocumentRecord {
  documentId: string;
  title: string;
  sourceType: "github" | "pdf" | "word";
  sourcePath: string | null;
  repo: string | null;
  branch: string | null;
  status: string;
  currentStage: string | null;
  chunkCount: number;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
  lastIngestedAt: number | null;
}

interface ApiResponse {
  code: number;
  message: string;
  data: {
    items: DocumentRecord[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  };
  timestamp: number;
}

interface StatusToggleResponse {
  code: number;
  message: string;
  data: {
    documentId: string;
    status: string;
  };
  timestamp: number;
}

interface RefreshResponse {
  code: number;
  message: string;
  data: {
    mode: "background_refresh" | "need_reupload";
    documentId?: string;
    sourceType?: "github" | "pdf" | "word";
    title?: string;
  };
  timestamp: number;
}

const statusMap: Record<string, string> = {
  uploading: "上传中",
  processing: "处理中",
  active: "使用中",
  failed: "失败",
  inactive: "停用",
};

const sourceTypeMap: Record<string, string> = {
  github: "GitHub",
  pdf: "PDF",
  word: "Word",
};

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

const loading = ref(false);
const actionLoading = ref(false);
const documents = ref<DocumentRecord[]>([]);
const currentPage = ref(1);
const pageSize = ref(3);
const total = ref(0);

const detailModalVisible = ref(false);
const deleteModalVisible = ref(false);
const refreshModalVisible = ref(false);
const selectedDoc = ref<DocumentRecord | null>(null);
const deleteTarget = ref<DocumentRecord | null>(null);
const refreshTarget = ref<DocumentRecord | null>(null);

const tableData = computed(() =>
  documents.value.map((doc) => ({
    key: doc.documentId,
    documentId: doc.documentId,
    title: doc.title,
    sourceType: sourceTypeMap[doc.sourceType] || doc.sourceType,
    sourceTypeRaw: doc.sourceType,
    createdAt: formatTime(doc.createdAt),
    status: statusMap[doc.status] || doc.status,
    statusRaw: doc.status,
    sourcePath: doc.sourcePath,
    repo: doc.repo,
    branch: doc.branch,
    currentStage: doc.currentStage,
    chunkCount: doc.chunkCount,
    errorMessage: doc.errorMessage,
    updatedAt: formatTime(doc.updatedAt),
    lastIngestedAt: doc.lastIngestedAt ? formatTime(doc.lastIngestedAt) : null,
  })),
);

const paginationConfig = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: false,
  position: ["bottomCenter"],
}));

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isBusy(status: string): boolean {
  return ["uploading", "processing", "deleting"].includes(status);
}

async function fetchDocuments() {
  loading.value = true;
  try {
    const response = await $fetch<ApiResponse>("/api/documents", {
      query: {
        page: currentPage.value,
        pageSize: pageSize.value,
        status: "all",
      },
    });
    if (response.code === 0) {
      documents.value = response.data.items;
      total.value = response.data.pagination.total;
    }
  } catch (error) {
    console.error("Failed to fetch documents:", error);
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pagination: { current: number; pageSize: number }) {
  currentPage.value = pagination.current;
  pageSize.value = pagination.pageSize;
  fetchDocuments();
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

async function toggleStatus(record: (typeof tableData.value)[0]) {
  const newStatus = record.statusRaw === "active" ? "inactive" : "active";
  try {
    const response = await $fetch<StatusToggleResponse>(
      `/api/documents/${record.documentId}/status`,
      {
        method: "PATCH",
        body: { status: newStatus },
      },
    );
    if (response.code === 0) {
      message.success(newStatus === "active" ? "已启用" : "已停用");
      fetchDocuments();
    } else {
      message.error(response.message || "操作失败");
    }
  } catch (error) {
    message.error("操作失败");
  }
}

function showDetail(record: (typeof tableData.value)[0]) {
  const originalDoc = documents.value.find(
    (d) => d.documentId === record.documentId,
  );
  if (originalDoc) {
    selectedDoc.value = originalDoc;
    detailModalVisible.value = true;
  }
}

function confirmDelete(record: (typeof tableData.value)[0]) {
  deleteTarget.value =
    documents.value.find((d) => d.documentId === record.documentId) || null;
  deleteModalVisible.value = true;
}

async function handleDelete() {
  if (!deleteTarget.value) return;
  actionLoading.value = true;
  try {
    const response = await $fetch<{ code: number; message: string }>(
      `/api/documents/${deleteTarget.value.documentId}`,
      {
        method: "DELETE",
      },
    );
    if (response.code === 0) {
      message.success("删除成功");
      deleteModalVisible.value = false;
      deleteTarget.value = null;
      fetchDocuments();
    } else {
      message.error(response.message || "删除失败");
    }
  } catch (error) {
    message.error("删除失败");
  } finally {
    actionLoading.value = false;
  }
}

function handleRefresh(record: (typeof tableData.value)[0]) {
  refreshTarget.value =
    documents.value.find((d) => d.documentId === record.documentId) || null;
  refreshModalVisible.value = true;
}

async function handleRefreshConfirm() {
  if (!refreshTarget.value) return;
  actionLoading.value = true;
  try {
    const response = await $fetch<RefreshResponse>(
      `/api/documents/${refreshTarget.value.documentId}/refresh`,
      {
        method: "POST",
      },
    );
    if (response.code === 0) {
      refreshModalVisible.value = false;
      refreshTarget.value = null;
      if (response.data.mode === "background_refresh") {
        message.success("已开始更新，请稍候");
        fetchDocuments();
      } else if (
        response.data.mode === "need_reupload" &&
        response.data.sourceType &&
        response.data.title
      ) {
        emit(
          "need-reupload",
          response.data.documentId!,
          response.data.sourceType,
          response.data.title,
        );
      }
    } else {
      message.error(response.message || "更新失败");
    }
  } catch (error) {
    message.error("更新失败");
  } finally {
    actionLoading.value = false;
  }
}

fetchDocuments();

defineExpose({
  refresh: fetchDocuments,
});

async function refreshFirstPage() {
  currentPage.value = 1;
  await fetchDocuments();
}
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
