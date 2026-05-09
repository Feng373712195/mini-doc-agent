<template>
  <div class="upload-view">
    <!-- Github 上传 -->
    <div v-if="type === 'github'" class="github-upload">
      <a-form layout="vertical">
        <a-form-item label="Github仓库地址">
          <a-input
            v-model:value="githubUrl"
            placeholder="请输入 http/https 开头的地址"
            :status="urlError ? 'error' : undefined"
          />
          <div v-if="urlError" class="error-text">{{ urlError }}</div>
        </a-form-item>
        <a-form-item>
          <div class="btn-warp">
            <a-button type="primary" @click="onGithubUpload">上传</a-button>
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
        :directory="false"
        :open-file-dialog-on-click="true"
      >
        <div class="upload-dragger">
          <UploadOutlined class="upload-icon" />
          <p class="upload-text">点击或拖拽文件到此处上传</p>
          <p class="upload-hint">支持单个 PDF 文件</p>
        </div>
      </a-upload>
      <div v-if="pdfError" class="error-text">{{ pdfError }}</div>
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
        :directory="false"
        :open-file-dialog-on-click="true"
      >
        <div class="upload-dragger">
          <UploadOutlined class="upload-icon" />
          <p class="upload-text">点击或拖拽文件到此处上传</p>
          <p class="upload-hint">支持单个 Word 文件</p>
        </div>
      </a-upload>
      <div v-if="wordError" class="error-text">{{ wordError }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { UploadOutlined } from "@ant-design/icons-vue";
import type { UploadProps, UploadFile } from "ant-design-vue";

const props = defineProps<{
  type: "github" | "pdf" | "word" | null;
}>();

const githubUrl = ref("");
const urlError = ref("");
const pdfFileList = ref<UploadFile[]>([]);
const pdfError = ref("");
const wordFileList = ref<UploadFile[]>([]);
const wordError = ref("");

function validateUrl(url: string): boolean {
  const regex = /^https?:\/\/.+/;
  return regex.test(url);
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
  // 上传逻辑后续实现
}

const beforePdfUpload: UploadProps["beforeUpload"] = (file) => {
  pdfError.value = "";
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    pdfError.value = "只能上传 PDF 文件！";
    return false;
  }
  return false; // 阻止自动上传，后续实现
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
    wordError.value = "只能上传 Word 文件！";
    return false;
  }
  return false; // 阻止自动上传，后续实现
};

const handleWordChange: UploadProps["onChange"] = (info) => {
  wordFileList.value = info.fileList;
};
</script>

<style lang="less" scoped>
.upload-view {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  :deep(.ant-upload) {
    width: 100%;
  }

  .github-upload {
    width: 100%;
    max-width: 400px;
    .btn-warp {
      display: flex;
      justify-content: center;
    }
  }

  .file-upload {
    width: 100%;
    max-width: 400px;
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

    &:active {
      border-color: #1890ff;
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
