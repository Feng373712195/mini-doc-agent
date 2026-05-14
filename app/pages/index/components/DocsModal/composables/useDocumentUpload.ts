/**
 * 文档上传逻辑 Composable
 * 负责文档上传和进度管理
 */

import { ref, computed, onBeforeUnmount } from "vue";
import { message } from "ant-design-vue";
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "~~/shared/constants/messages";

/**
 * 上传模式配置
 */
interface UploadMode {
  /** 文档 ID（更新模式） */
  documentId: string;
  /** 文档标题 */
  title: string;
}

/**
 * 文档上传管理
 * @param updateMode 更新模式配置（可选）
 * @param onCompleted 上传完成回调
 * @returns 上传状态和操作方法
 */
export function useDocumentUpload(
  updateMode: UploadMode | null | undefined,
  onCompleted: () => void,
) {
  /** 上传中状态 */
  const uploading = ref(false);
  /** 上传进度（0-100） */
  const progress = ref(0);
  /** 进度文本描述 */
  const progressText = ref("");
  /** SSE 事件源 */
  let eventSource: EventSource | null = null;

  /**
   * 进度状态（用于进度条显示）
   */
  const progressStatus = computed(() =>
    progress.value >= 100 ? "success" : "active",
  );

  /**
   * 关闭进度流
   * 断开 SSE 连接
   */
  function closeProgressStream(): void {
    eventSource?.close();
    eventSource = null;
  }

  /**
   * 上传完成处理
   * @param success 是否成功
   */
  function onUploadComplete(success: boolean): void {
    uploading.value = false;
    closeProgressStream();
    if (success) {
      message.success(updateMode ? SUCCESS_MESSAGES.UPDATE_SUCCESS : SUCCESS_MESSAGES.UPLOAD_SUCCESS);
    }
    onCompleted();
  }

  /**
   * 订阅上传进度
   * 通过 SSE 接收服务器推送的进度事件
   * @param jobId 任务 ID
   */
  function subscribeProgress(jobId: string): void {
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
        message.error(payload.message || ERROR_MESSAGES.UPLOAD_FAILED);
        onUploadComplete(false);
      }
    });
  }

  /**
   * 提交上传请求
   * 根据是否为更新模式选择不同的 API 端点
   * @param formData 表单数据
   */
  async function submit(formData: FormData): Promise<void> {
    uploading.value = true;
    progress.value = 0;
    progressText.value = "queued";

    try {
      const url = updateMode
        ? `/api/documents/${updateMode.documentId}/update`
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
      message.error(err instanceof Error ? err.message : ERROR_MESSAGES.UPLOAD_FAILED);
      onCompleted();
    }
  }

  // 组件卸载时清理资源
  onBeforeUnmount(() => {
    closeProgressStream();
  });

  return {
    // 状态
    uploading,
    progress,
    progressText,
    progressStatus,
    // 方法
    submit,
    subscribeProgress,
    closeProgressStream,
    onUploadComplete,
  };
}
