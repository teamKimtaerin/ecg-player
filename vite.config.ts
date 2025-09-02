import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 서버 설정 (개발 환경)
  server: {
    fs: {
      allow: ['..']
    }
  }
})
