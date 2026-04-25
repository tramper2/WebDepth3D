import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 배포를 위한 base 경로 설정
  // 레포지토리 이름이 'WebDepth3D'이므로 '/WebDepth3D/'로 설정
  base: '/WebDepth3D/',

  server: {
    port: 3000,
    host: true, // WSL2에서 윈도우 접근 허용
    watch: {
      usePolling: true, // WSL2 파일 변경 감지 안정화
    },
    // Hugging Face CORS 문제 해결을 위한 프록시 설정
    proxy: {
      '/hf': {
        target: 'https://huggingface.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hf/, ''),
        secure: false
      }
    }
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },

  // 최적화 설정 - Hugging Face Transformers와 onnxruntime-web 충돌 방지
  optimizeDeps: {
    exclude: ['@huggingface/transformers', 'onnxruntime-web']
  },

  // 전역 변수 정의
  define: {
    global: 'globalThis'
  }
});
