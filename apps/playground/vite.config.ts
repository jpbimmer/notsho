import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { themeScript } from "@notsho/theme/script";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "notsho-theme-script",
      transformIndexHtml: (html) => html.replace("<!--THEME_SCRIPT-->", `<script>${themeScript()}</script>`),
    },
  ],
});
