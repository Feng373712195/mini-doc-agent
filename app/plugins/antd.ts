import Antd from "ant-design-vue";
import { defineNuxtPlugin } from "nuxt/app";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Antd);
});

