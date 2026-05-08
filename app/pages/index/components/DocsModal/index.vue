<template>
  <a-modal
    v-model:open="open"
    title="文档管理"
    :width="600"
    :footer="null"
    :body-style="{ height: '500px', padding: '0' }"
    @cancel="onCancel"
  >
    <div class="docs-modal">
      <!-- 顶部操作区 -->
      <div class="modal-header">
        <a-button v-if="currentView !== 'list'" @click="goBack">返回</a-button>
        <a-button v-else type="primary" @click="goToUploadTypes">上传文档</a-button>
      </div>

      <!-- 内容区 -->
      <div class="modal-content">
        <ListView v-if="currentView === 'list'" />
        <UploadTypesView v-else-if="currentView === 'upload-types'" @select="onSelectType" />
        <UploadView v-else-if="currentView === 'upload'" :type="uploadType" />
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ListView from "./ListView.vue";
import UploadTypesView from "./UploadTypesView.vue";
import UploadView from "./UploadView.vue";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

type ViewType = "list" | "upload-types" | "upload";
const currentView = ref<ViewType>("list");
const uploadType = ref<"github" | "pdf" | "word" | null>(null);
const viewHistory = ref<ViewType[]>(["list"]);

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
    currentView.value = viewHistory.value[viewHistory.value.length - 1];
    if (currentView.value === "list") {
      uploadType.value = null;
    }
  }
}

function onCancel() {
  emit("update:open", false);
  // 重置状态
  currentView.value = "list";
  uploadType.value = null;
  viewHistory.value = ["list"];
}
</script>

<style lang="less" scoped>
.docs-modal {
  height: 100%;
  display: flex;
  flex-direction: column;

  .modal-header {
    padding: 16px 24px;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
  }

  .modal-content {
    flex: 1;
    padding: 16px 24px;
    overflow: hidden;
  }
}
</style>
