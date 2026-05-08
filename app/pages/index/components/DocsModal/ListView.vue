<template>
  <div class="list-view">
    <a-table :columns="columns" :data-source="data" :pagination="pagination" :scroll="{ y: 320 }" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const columns = [
  {
    title: "文档名称",
    dataIndex: "name",
    key: "name",
  },
  {
    title: "类型",
    dataIndex: "type",
    key: "type",
  },
  {
    title: "上传时间",
    dataIndex: "time",
    key: "time",
  },
];

const data = ref([
  {
    key: "1",
    name: "示例文档1.pdf",
    type: "PDF",
    time: "2024-01-01 10:00",
  },
  {
    key: "2",
    name: "示例文档2.docx",
    type: "Word",
    time: "2024-01-02 14:30",
  },
]);

const pagination = {
  current: 1,
  pageSize: 10,
  total: 2,
  showSizeChanger: false,
};
</script>

<style lang="less" scoped>
.list-view {
  height: 100%;
}
</style>
