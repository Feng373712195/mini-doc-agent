// 引入入口级初始化逻辑（代理等）。
import "./bootstrap.js";
// 引入读取与切分、向量构建函数。
import { loadAndSplitDocs, buildVectorStore } from "./rag.js";

// 定义主执行函数，负责 ingest 流程。
async function main() {
  // 读取 docs 并切分为文档块。
  const chunks = await loadAndSplitDocs();

  // 打印切分结果，方便确认读取是否成功。
  console.log(
    // 以格式化 JSON 输出块数量与块内容。
    JSON.stringify(
      // 构造输出对象。
      {
        // 输出切分块总数量。
        chunkCount: chunks.length,
        // 输出每个块的 id、内容和元数据。
        chunks: chunks.map((doc: any, index: number) => ({
          // 块序号。
          id: index,
          // 块文本。
          content: doc.pageContent,
          // 块元信息（来源文件等）。
          metadata: doc.metadata,
        })),
      },
      // 传入 replacer，null 表示不做字段过滤。
      null,
      // 设置缩进空格为 2，提高可读性。
      2
    )
  );

  // 在打印成功后，继续构建并保存 HNSWLib 向量索引。
  await buildVectorStore(chunks);
  // 给出索引保存完成提示。
  console.log("\nHNSWLib 向量索引已生成到 ./vector-store");
}

// 执行主函数并统一处理异常。
main().catch((error) => {
  // 打印错误信息。
  console.error("ingest 执行失败:", error);
  // 异常退出进程。
  process.exit(1);
});
