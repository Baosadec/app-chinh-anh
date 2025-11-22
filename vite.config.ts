import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // QUAN TRỌNG: Thay đổi '/app-chinh-anh/' thành tên repository của bạn nếu khác
  base: '/app-chinh-anh/', 
  plugins: [react()],
  define: {
    // Gắn cứng API Key vào biến môi trường của ứng dụng
    'process.env.API_KEY': JSON.stringify("AIzaSyBkSrCmBaJK5ZPQpqCvZexTFZBfBbKyBK0"),
  },
});