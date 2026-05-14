/**
 * 文档操作逻辑 Composable
 * 负责文档的删除、刷新、状态切换等操作
 */

import { ref } from "vue";
import { message } from "ant-design-vue";
import type { DocumentRecord, DocumentSourceType } from "~~/shared/document";
import type {
  DocumentStatusToggleResponse,
  DocumentRefreshResponse,
} from "~~/shared/api";

/**
 * 文档操作的回调函数类型
 */
interface DocumentActionsCallbacks {
  /** 操作成功后的刷新回调 */
  onRefreshNeeded: () => void;
  /** 需要重新上传时的回调 */
  onNeedReupload: (
    documentId: string,
    sourceType: DocumentSourceType,
    title: string,
  ) => void;
}

/**
 * 文档操作逻辑管理
 * @param callbacks 操作回调函数
 * @returns 文档操作状态和方法
 */
export function useDocumentActions(callbacks: DocumentActionsCallbacks) {
  /** 操作加载状态 */
  const actionLoading = ref(false);
  /** 删除确认弹窗显示状态 */
  const deleteModalVisible = ref(false);
  /** 刷新确认弹窗显示状态 */
  const refreshModalVisible = ref(false);
  /** 待删除的文档 */
  const deleteTarget = ref<DocumentRecord | null>(null);
  /** 待刷新的文档 */
  const refreshTarget = ref<DocumentRecord | null>(null);

  /**
   * 切换文档状态（启用/停用）
   * @param documentId 文档 ID
   * @param currentStatus 当前状态
   * @returns 是否操作成功
   */
  async function toggleStatus(
    documentId: string,
    currentStatus: string,
  ): Promise<boolean> {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const response = await $fetch<DocumentStatusToggleResponse>(
        `/api/documents/${documentId}/status`,
        {
          method: "PATCH",
          body: { status: newStatus },
        },
      );
      if (response.code === 0) {
        message.success(newStatus === "active" ? "已启用" : "已停用");
        callbacks.onRefreshNeeded();
        return true;
      } else {
        message.error(response.message || "操作失败");
        return false;
      }
    } catch (error) {
      message.error("操作失败");
      return false;
    }
  }

  /**
   * 显示删除确认弹窗
   * @param doc 待删除的文档
   */
  function confirmDelete(doc: DocumentRecord): void {
    deleteTarget.value = doc;
    deleteModalVisible.value = true;
  }

  /**
   * 执行删除操作
   * @returns 是否删除成功
   */
  async function deleteDocument(): Promise<boolean> {
    if (!deleteTarget.value) return false;
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
        callbacks.onRefreshNeeded();
        return true;
      } else {
        message.error(response.message || "删除失败");
        return false;
      }
    } catch (error) {
      message.error("删除失败");
      return false;
    } finally {
      actionLoading.value = false;
    }
  }

  /**
   * 显示刷新确认弹窗
   * @param doc 待刷新的文档
   */
  function confirmRefresh(doc: DocumentRecord): void {
    refreshTarget.value = doc;
    refreshModalVisible.value = true;
  }

  /**
   * 执行刷新操作
   * 根据文档类型采用不同策略：
   * - GitHub: 后台重建
   * - PDF/Word: 需要重新上传
   */
  async function refreshDocument(): Promise<void> {
    if (!refreshTarget.value) return;
    actionLoading.value = true;
    try {
      const response = await $fetch<DocumentRefreshResponse>(
        `/api/documents/${refreshTarget.value.documentId}/refresh`,
        {
          method: "POST",
        },
      );
      if (response.code === 0) {
        refreshModalVisible.value = false;
        refreshTarget.value = null;
        if (response.data.mode === "background_refresh") {
          // GitHub 类型：后台重建
          message.success("已开始更新，请稍候");
          callbacks.onRefreshNeeded();
        } else if (
          response.data.mode === "need_reupload" &&
          response.data.sourceType &&
          response.data.title
        ) {
          // PDF/Word 类型：需要重新上传
          callbacks.onNeedReupload(
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

  return {
    // 状态
    actionLoading,
    deleteModalVisible,
    refreshModalVisible,
    deleteTarget,
    refreshTarget,
    // 方法
    toggleStatus,
    confirmDelete,
    deleteDocument,
    confirmRefresh,
    refreshDocument,
  };
}
