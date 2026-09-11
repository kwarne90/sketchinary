import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },
  modules: ["@nuxtjs/tailwindcss"],
  tailwindcss: {
    cssPath: "~/assets/css/main.css",
    configPath: "tailwind.config.ts",
  },
  css: ["~/assets/css/main.css"],
  alias: {
    "#shared": fileURLToPath(new URL("../shared/types.ts", import.meta.url)),
  },
  app: {
    head: {
      title: "Sketchinary",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap",
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      socketUrl: "",
    },
  },
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ["/"],
    },
    devProxy: {
      "/socket.io": {
        target: "http://127.0.0.1:3001/socket.io",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  compatibilityDate: "2025-01-01",
});
