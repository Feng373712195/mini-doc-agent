<template>
  <div class="upload-view">
    <div class="progress-wrap" v-if="uploading">
      <a-progress :percent="progress" :status="progressStatus" />
      <div class="progress-text">{{ progressText }}</div>
    </div>

    <div v-if="updateMode" class="update-hint">
      <a-alert type="info" :message="`正在更新文档：${updateMode.title}`" />
    </div>

    <!-- Github 上传 -->
    <div v-if="type === 'github'" class="github-upload">
      <a-form layout="vertical">
        <a-form-item label="Github仓库地址">
          <a-input
            v-model:value="githubUrl"
            placeholder="请输入 http/https 开头的地址"
            :status="urlError ? 'error' : undefined"
            :disabled="uploading"
          />
          <div v-if="urlError" class="error-text">{{ urlError }}</div>
        </a-form-item>
        <a-form-item label="分支（可选）">
          <a-input
            v-model:value="branch"
            placeholder="例如 main"
            :disabled="uploading"
          />
        </a-form-item>
        <a-form-item>
          <div class="btn-wrap">
            <a-button
              type="primary"
              @click="onGithubUpload"
              :loading="uploading"
            >{{ updateMode ? '更新' : '上传' }}</a-button>
          </div>
        </a-form-item>
      </a-form>
    </div>

    <!-- PDF 上传 -->
    <div v-else-if="type === 'pdf'" class="file-upload">
      <a-upload
        :before-upload="beforePdfUpload"
        :file-list="pdfFileList"
        @change="handlePdfChange"
        accept=".pdf"
        :multiple="false"
        :max-count="1"
      >
        <div class="upload-dragger">
          <UploadOutlined class="upload-icon" />
          <p class="upload-text">点击或拖拽文件到此处上传</p>
          <p class="upload-hint">支持单个 PDF 文件</p>
        </div>
      </a-upload>
      <div v-if="pdfError" class="error-text">{{ pdfError }}</div>
      <div class="btn-wrap">
        <a-button
          type="primary"
          @click="onFileUpload('pdf')"
          :loading="uploading"
        >{{ updateMode ? '更新' : '上传' }}</a-button>
      </div>
    </div>

    <!-- Word 上传 -->
    <div v-else-if="type === 'word'" class="file-upload">
      <a-upload
        :before-upload="beforeWordUpload"
        :file-list="wordFileList"
        @change="handleWordChange"
        accept=".doc,.docx"
        :multiple="false"
        :max-count="1"
      >
        <div class="upload-dragger">
          <UploadOutlined class="upload-icon" />
          <p class="upload-text">点击或拖拽文件到此处上传</p>
          <p class="upload-hint">支持单个 Word 文件</p>
        </div>
      </a-upload>
      <div v-if="wordError" class="error-text">{{ wordError }}</div>
      <div class="btn-wrap">
        <a-button
          type="primary"
          @click="onFileUpload('word')"
          :loading="uploading"
        >{{ updateMode ? '更新' : '上传' }}</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { message } from "ant-design-vue";
import { UploadOutlined } from "@ant-design/icons-vue";
import type { UploadProps, UploadFile } from "ant-design-vue";

const emit = defineEmits<{
  completed: [];
}>();

const props = defineProps<{
  type: "github" | "pdf" | "word" | null;
  updateMode?: { documentId: string; title: string } | null;
}>();

const githubUrl = ref("");
const branch = ref("");
const urlError = ref("");
const pdfFileList = ref<UploadFile[]>([]);
const pdfError = ref("");
const wordFileList = ref<UploadFile[]>([]);
const wordError = ref("");

const uploading = ref(false);
const progress = ref(0);
const progressText = ref("");
let eventSource: EventSource | null = null;

const progressStatus = computed(() =>
  progress.value >= 100 ? "success" : "active",
);

function validateUrl(url: string): boolean {
  const regex = /^https?:\/\/.+/;
  return regex.test(url);
}

function closeProgressStream() {
  eventSource?.close();
  eventSource = null;
}

function onUploadComplete(success: boolean) {
  uploading.value = false;
  closeProgressStream();
  if (success) {
    message.success(props.updateMode ? "更新并入库成功" : "上传并入库成功");
  }
  emit("completed");
}

function subscribeProgress(jobId: string) {
  closeProgressStream();
  eventSource = new EventSource(
    `/api/ingestion/jobs/${encodeURIComponent(jobId)}/events`,
  );
  eventSource.addEventListener("progress", (evt: MessageEvent) => {
    const payload = JSON.parse(evt.data) as {
      stage: string;
      progress: number;
      message?: string;
    };
    progress.value = payload.progress || 0;
    progressText.value = payload.message || payload.stage;
    if (payload.stage === "completed") {
      onUploadComplete(true);
    }
    if (payload.stage === "failed") {
      message.error(payload.message || "上传失败");
      onUploadComplete(false);
    }
  });
}

async function submit(formData: FormData) {
  uploading.value = true;
  progress.value = 0;
  progressText.value = "queued";

  try {
    const url = props.updateMode 
      ? `/api/documents/${props.updateMode.documentId}/update` 
      : "/api/ingestion/upload";
    const resp = await $fetch<{
      code: number;
      message: string;
      data: { ingestionJobId: string };
      timestamp: number;
    }>(url, {
      method: "POST",
      body: formData,
    });
    subscribeProgress(resp.data.ingestionJobId);
  } catch (err) {
    uploading.value = false;
    message.error(err instanceof Error ? err.message : "上传失败");
    emit("completed");
  }
}

function onGithubUpload() {
  urlError.value = "";
  if (!githubUrl.value) {
    urlError.value = "请输入地址";
    return;
  }
  if (!validateUrl(githubUrl.value)) {
    urlError.value = "请输入 http/https 开头的有效地址";
    return;
  }

  const formData = new FormData();
  formData.append("type", "github");
  formData.append("repoUrl", githubUrl.value);
  if (branch.value.trim()) formData.append("branch", branch.value.trim());
  void submit(formData);
}

const beforePdfUpload: UploadProps["beforeUpload"] = (file) => {
  pdfError.value = "";
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    pdfError.value = "只能上传 PDF 文件";
    return false;
  }
  return false;
};

const handlePdfChange: UploadProps["onChange"] = (info) => {
  pdfFileList.value = info.fileList;
};

const beforeWordUpload: UploadProps["beforeUpload"] = (file) => {
  wordError.value = "";
  const isWord =
    file.type === "application/msword" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".doc") ||
    file.name.toLowerCase().endsWith(".docx");
  if (!isWord) {
    wordError.value = "只能上传 Word 文件";
    return false;
  }
  return false;
};

const handleWordChange: UploadProps["onChange"] = (info) => {
  wordFileList.value = info.fileList;
};

function onFileUpload(uploadType: "pdf" | "word") {
  const selected =
    uploadType === "pdf" ? pdfFileList.value[0] : wordFileList.value[0];
  if (!selected?.originFileObj) {
    message.warning("请先选择文件");
    return;
  }

  const formData = new FormData();
  formData.append("type", uploadType);
  formData.append("file", selected.originFileObj);
  void submit(formData);
}

onBeforeUnmount(() => {
  closeProgressStream();
});
</script>

<style lang="less" scoped>
.upload-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  :deep(.ant-upload) {
    width: 100%;
  }

  .progress-wrap {
    width: 100%;
    max-width: 420px;
    margin-bottom: 16px;

    .progress-text {
      margin-top: 8px;
      font-size: 12px;
      color: #666;
    }
  }

  .update-hint {
    width: 100%;
    max-width: 420px;
    margin-bottom: 16px;
  }

  .github-upload,
  .file-upload {
    width: 100%;
    max-width: 420px;
  }

  .btn-wrap {
    display: flex;
    justify-content: center;
    margin-top: 12px;
  }

  .upload-dragger {
    border: 2px dashed #d9d9d9;
    border-radius: 8px;
    padding: 40px 20px;
    text-align: center;
    transition: all 0.3s ease;
    cursor: pointer;

    &:hover {
      border-color: #1890ff;
      background: #f6ffed;
    }
  }

  .upload-icon {
    font-size: 48px;
    color: #999;
    margin-bottom: 16px;
  }

  .upload-text {
    font-size: 16px;
    color: #666;
    margin-bottom: 8px;
  }

  .upload-hint {
    font-size: 12px;
    color: #999;
  }

  .error-text {
    color: #ff4d4f;
    font-size: 12px;
    margin-top: 4px;
  }
}
</style>
