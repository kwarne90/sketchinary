/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./composables/**/*.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F8EDD8",
        paper: "#FFF8EE",
        ink: "#3D2B27",
        coral: "#FF6B5B",
        "coral-dark": "#E85A4B",
        teal: "#3ECFCF",
        grape: "#8B7CFF",
      },
      fontFamily: {
        display: ["Fredoka", "system-ui", "sans-serif"],
      },
      boxShadow: {
        chunk: "0 8px 0 0 rgba(61, 43, 39, 0.12)",
        bubble: "0 4px 0 0 rgba(61, 43, 39, 0.1)",
      },
    },
  },
};
