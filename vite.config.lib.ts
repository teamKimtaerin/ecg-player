import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// Library build configuration
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/lib'],
      outputDir: 'dist/types',
      insertTypesEntry: true,
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'ECGPlayer',
      fileName: (format) => `ecg-player.${format}.js`,
      formats: ['es', 'cjs', 'umd']
    },
    rollupOptions: {
      // 외부 의존성 설정 - 번들에 포함하지 않음
      external: ['react', 'react-dom'],
      output: {
        // UMD 빌드를 위한 전역 변수 설정
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        // CSS를 별도 파일로 추출
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'ecg-player.css';
          }
          return assetInfo.name;
        }
      }
    },
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 개발 중에는 console 유지
        drop_debugger: true
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});