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
          <a-button type="primary" @click="onGithubUpload">上传</a-button>
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
      >
        <a-button>
          <UploadOutlined />
          选择PDF文件
        </a-button>
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
      >
        <a-button>
          <UploadOutlined />
          选择Word文件
        </a-button>
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
  type: "github" | "pdf" | "word";
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
  padding-top: 20px;

  .github-upload,
  .file-upload {
    max-width: 400px;
    margin: 0 auto;
  }

  .error-text {
    color: #ff4d4f;
    font-size: 12px;
    margin-top: 4px;
  }
}
</style>
