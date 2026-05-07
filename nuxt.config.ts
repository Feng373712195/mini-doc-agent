import { defineNuxtConfig } from "nuxt/config";
import { resolve } from "node:path";

export default defineNuxtConfig({
  // 将前端源代码收敛到 app/ 目录，方便开源与维护（目录结构以 README 为准）。
  srcDir: "app/",
  // server/ 保持在仓库根目录（README 结构要求）。
  // 注意：serverDir 是相对仓库根目录（rootDir）的路径。
  serverDir: "server",
  devtools: { enabled: false },
  css: ["~/assets/styles/app.less"],
  vite: {
    css: {
      preprocessorOptions: {
        less: {
          // 自动注入 Less 变量文件到每个组件的 style 中
          additionalData: '@import "~/assets/styles/app.less";',
        },
      },
    },
  },
  app: {
    head: {
      title: "RepoMind",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },
  // shared/ 目录位于仓库根目录，不在 srcDir 之下，这里通过 alias 提供通用路径。
  alias: {
    "~/shared": resolve(process.cwd(), "shared"),
  },
  typescript: {
    strict: true,
  },
});
