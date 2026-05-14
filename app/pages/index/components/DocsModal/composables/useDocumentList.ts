/**
 * 文档列表数据管理 Composable
 * 负责文档列表的数据请求、分页和状态管理
 */

import { ref } from "vue";
import type { DocumentRecord } from "~~/shared/document";
import type { DocumentListResponse } from "~~/shared/api";
import { PAGINATION_CONFIG } from "~~/server/config";

/**
 * 文档列表数据管理
 * @returns 文档列表状态和操作方法
 */
export function useDocumentList() {
  /** 文档列表数据 */
  const documents = ref<DocumentRecord[]>([]);
  /** 当前页码 */
  const currentPage = ref(1);
  /** 每页条数 */
  const pageSize = ref<number>(PAGINATION_CONFIG.defaultPageSize);
  /** 总记录数 */
  const total = ref(0);
  /** 加载状态 */
  const loading = ref(false);

  /**
   * 获取文档列表
   * 从服务器获取指定页的文档数据
   */
  async function fetchDocuments(): Promise<void> {
    loading.value = true;
    try {
      const response = await $fetch<DocumentListResponse>("/api/documents", {
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

  /**
   * 处理表格分页变化
   * @param pagination 分页配置对象
   */
  function handleTableChange(pagination: {
    current: number;
    pageSize: number;
  }): void {
    currentPage.value = pagination.current;
    pageSize.value = pagination.pageSize;
    fetchDocuments();
  }

  /**
   * 刷新第一页数据
   * 用于新增/删除文档后回到第一页并刷新
   */
  async function refreshFirstPage(): Promise<void> {
    currentPage.value = 1;
    await fetchDocuments();
  }

  return {
    // 状态
    documents,
    currentPage,
    pageSize,
    total,
    loading,
    // 方法
    fetchDocuments,
    handleTableChange,
    refreshFirstPage,
  };
}
