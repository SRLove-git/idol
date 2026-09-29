import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 构建产物直接输出到项目根的 public/（由 server.mjs 在 / 提供）；
// emptyOutDir=false 保留 public/ 里已有的 /app、/action、/resources 等旧路由。
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../public',
    emptyOutDir: false
  },
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true }
    }
  }
})
