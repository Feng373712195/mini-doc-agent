<template>
  <div class="upload-types-view">
    <div class="type-buttons">
      <div class="type-button" @click="onSelect('github')">
        <GithubOutlined class="type-icon" />
        <span class="type-text">Github</span>
      </div>
      <div class="type-button" @click="onSelect('pdf')">
        <FilePdfOutlined class="type-icon" />
        <span class="type-text">PDF上传</span>
      </div>
      <div class="type-button" @click="onSelect('word')">
        <FileWordOutlined class="type-icon" />
        <span class="type-text">Word上传</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  GithubOutlined,
  FilePdfOutlined,
  FileWordOutlined,
} from "@ant-design/icons-vue";

const emit = defineEmits<{
  select: [type: "github" | "pdf" | "word"];
}>();

function onSelect(type: "github" | "pdf" | "word") {
  emit("select", type);
}
</script>

<style lang="less" scoped>
.upload-types-view {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  .type-buttons {
    display: flex;
    gap: 24px;
  }

  .type-button {
    width: 120px;
    height: 120px;
    background: #f5f5f5;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #e8e8e8;
    }

    .type-icon {
      font-size: 40px;
      color: #595959;
      margin-bottom: 8px;
    }

    .type-text {
      font-size: 14px;
      color: #262626;
    }
  }
}
</style>
