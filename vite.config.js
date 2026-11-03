import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      watch: {
        ignored: ["**/.runtime/**", "**/.venv/**", "**/__pycache__/**", "**/.pytest_cache/**", "**/backend/data/**"],
      },
      fs: {
        deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.runtime/**", "**/.venv/**", "**/backend/data/**"],
      },
      proxy: {
        "/api": env.API_PROXY_TARGET || `http://127.0.0.1:${env.PORT || 3333}`,
      },
    },
  };
});
