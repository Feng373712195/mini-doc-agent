import { defineConfig } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
  },
  webServer: {
    command: `npm.cmd run dev -- --port ${port} --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      CHAT_MOCK: "1",
      USE_MOCK_RAG: "1",
      // Avoid accidental usage of real keys in CI.
      CHAT_API_KEY: "",
      EMBEDDING_API_KEY: "",
    },
  },
});

