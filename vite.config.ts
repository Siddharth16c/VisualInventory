import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    worker: {
        format: 'es', // Required: FFmpeg worker uses dynamic imports, incompatible with default IIFE format
    },
    server: {
        port: 5190,
        strictPort: true,
        headers: {
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
        },
        host: true,
    },
    optimizeDeps: {
        exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', 'jspdf', 'pdfjs-dist'],
        include: ['prop-types'],
    },
});
