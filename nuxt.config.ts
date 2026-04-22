import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
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
  typescript: {
    strict: true,
  },
});
