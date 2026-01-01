import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => ({
    plugins: [react()],
    base: command === 'build' ? './' : '/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: 'dist-react',
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        strictPort: true,
    }
}));
