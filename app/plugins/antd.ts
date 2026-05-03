import Antd from "ant-design-vue";
import { defineNuxtPlugin } from "nuxt/app";

export default defineNuxtPlugin((nuxtApp: NuxtApp<RuntimeConfig>) => {
  nuxtApp.vueApp.use(Antd);
});

