import { defineNuxtConfig } from "nuxt/config";
import { resolve } from "node:path";

export default defineNuxtConfig({
  // 将前端源代码收敛到 app/ 目录，方便开源与维护（目录结构以 README 为准）。
  srcDir: "app/",
  // server/ 保持在仓库根目录（README 结构要求）。
  // 注意：serverDir 是相对仓库根目录（rootDir）的路径。
  serverDir: "server",
  devtools: { enabled: true },
  css: ["ant-design-vue/dist/reset.css", "~/assets/app.css"],
  app: {
    head: {
      title: "Mini Doc Agent",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },
  runtimeConfig: {
    chatApiKey: process.env.CHAT_API_KEY,
    chatModel: process.env.CHAT_MODEL,
    chatBaseUrl: process.env.CHAT_BASE_URL,
    embeddingApiKey: process.env.EMBEDDING_API_KEY,
    embeddingModel: process.env.EMBEDDING_MODEL,
    embeddingBaseUrl: process.env.EMBEDDING_BASE_URL,
    embeddingDimensions: process.env.EMBEDDING_DIMENSIONS
      ? Number(process.env.EMBEDDING_DIMENSIONS)
      : undefined,
    dataDir: process.env.DATA_DIR,
    public: {},
  },
  // shared/ 目录位于仓库根目录，不在 srcDir 之下，这里通过 alias 提供通用路径。
  alias: {
    "~/shared": resolve(process.cwd(), "shared"),
  },
  typescript: {
    strict: true,
  },
});
