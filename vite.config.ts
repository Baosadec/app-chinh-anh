import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Cấu hình đường dẫn cơ sở khớp với tên repository mới: chinh-anh-model
  base: '/chinh-anh-model/', 
  plugins: [react()],
  define: {
    // Gắn cứng API Key vào biến môi trường của ứng dụng để chạy ngay lập tức
    'process.env.API_KEY': JSON.stringify("AIzaSyBkSrCmBaJK5ZPQpqCvZexTFZBfBbKyBK0"),
  },
});