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
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
        { name: "theme-color", content: "#F8EDD8" },
        { name: "apple-mobile-web-app-title", content: "Sketchinary" },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/favicon-96x96.png", sizes: "96x96" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "shortcut icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
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
      script:
        process.env.NODE_ENV === "production"
          ? [
              {
                src: "https://cloud.umami.is/script.js",
                defer: true,
                "data-website-id": "2c9adedf-7403-4ede-b988-3846bb2595ed",
              },
            ]
          : [],
    },
  },
  runtimeConfig: {
    public: {
      socketUrl: "",
    },
  },
  nitro: {
    publicAssets: [
      {
        dir: fileURLToPath(new URL("./assets/favicon", import.meta.url)),
        maxAge: 60 * 60 * 24 * 7,
      },
    ],
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
