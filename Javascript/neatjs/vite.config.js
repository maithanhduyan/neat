// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.js', // Điểm đầu vào của thư viện
            name: 'neatjs', // Tên thư viện
            fileName: (format) => `neat.${format}.js`, // Tên tệp đầu ra
            formats: ['es', 'umd']  // Chỉ build định dạng ES module
        },
        rollupOptions: {
            // Đảm bảo các dependencies không bị bao gồm trong build
            external: [],
            output: {
                globals: {
                    // Định nghĩa các thư viện bên ngoài (nếu có)
                },
            },
        },
    },
});
