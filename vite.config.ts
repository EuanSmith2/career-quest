/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // localhost only. For phone testing on the same wifi, run `npm run dev -- --host` on a network you trust.
  server: { host: "localhost", port: 8080 },
  test: { include: ["src/**/*.test.ts"] },
});
