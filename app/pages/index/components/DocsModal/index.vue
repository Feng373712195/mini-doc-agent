<template>
  <a-modal
    v-model:open="isOpen"
    title="文档管理"
    :width="600"
    :footer="null"
    :body-style="{ height: '350px', padding: '0' }"
    @cancel="onCancel"
  >
    <div class="docs-modal">
      <div class="modal-content">
        <ListView
          v-if="currentView === 'list'"
          ref="listViewRef"
          @need-reupload="handleNeedReupload"
        />
        <UploadTypesView
          v-else-if="currentView === 'upload-types'"
          @select="onSelectType"
        />
        <UploadView
          v-else-if="currentView === 'upload'"
          :type="uploadType"
          :update-mode="updateMode"
          @completed="onUploadCompleted"
        />
      </div>

      <div class="modal-footer">
        <a-button v-if="currentView !== 'list'" @click="goBack">返回</a-button>
        <a-button v-else type="primary" @click="goToUploadTypes">
          上传文档
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import ListView from "./ListView.vue";
import UploadTypesView from "./UploadTypesView.vue";
import UploadView from "./UploadView.vue";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

type ViewType = "list" | "upload-types" | "upload";
const currentView = ref<ViewType>("list");
const uploadType = ref<"github" | "pdf" | "word" | null>(null);
const viewHistory = ref<ViewType[]>(["list"]);
const listViewRef = ref<InstanceType<typeof ListView> | null>(null);
const updateMode = ref<{ documentId: string; title: string } | null>(null);

function goToUploadTypes() {
  currentView.value = "upload-types";
  viewHistory.value.push("upload-types");
}

function onSelectType(type: "github" | "pdf" | "word") {
  uploadType.value = type;
  currentView.value = "upload";
  viewHistory.value.push("upload");
}

function goBack() {
  if (viewHistory.value.length > 1) {
    viewHistory.value.pop();
    currentView.value = viewHistory.value[
      viewHistory.value.length - 1
    ] as ViewType;
    if (currentView.value === "list") {
      uploadType.value = null;
      updateMode.value = null;
    }
  }
}

function onUploadCompleted() {
  currentView.value = "list";
  uploadType.value = null;
  updateMode.value = null;
  viewHistory.value = ["list"];
  listViewRef.value?.refreshFirstPage();
}

function onCancel() {
  emit("update:open", false);
  currentView.value = "list";
  uploadType.value = null;
  updateMode.value = null;
  viewHistory.value = ["list"];
}

function handleNeedReupload(
  documentId: string,
  sourceType: "github" | "pdf" | "word",
  title: string,
) {
  uploadType.value = sourceType;
  updateMode.value = { documentId, title };
  currentView.value = "upload";
  viewHistory.value = ["list", "upload"];
}
</script>

<style lang="less" scoped>
.docs-modal {
  height: 100%;
  display: flex;
  flex-direction: column;

  .modal-content {
    flex: 1;
    padding: 16px 24px;
    overflow: hidden;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 12px 24px;
    border-top: 1px solid #f0f0f0;
    background: #ffffff;

    :deep(.ant-btn) {
      margin-left: 8px;

      &:first-child {
        margin-left: 0;
      }
    }
  }
}
</style>
