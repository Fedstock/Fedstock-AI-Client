import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/analyze-csv": "http://127.0.0.1:8000",
      "/start-training": "http://127.0.0.1:8000",
      "/training-status": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
});
