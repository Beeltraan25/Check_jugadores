/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // iPhone/iPad con iOS 15.4 o más, Android con Chrome reciente y navegadores de escritorio.
    target: ['es2020', 'safari15.4', 'ios15.4', 'chrome100', 'edge100', 'firefox100'],
    // pdf.js (~550 kB) solo se descarga al importar un PDF desde la oficina.
    chunkSizeWarningLimit: 600,
  },
  // pdf.js se carga solo al importar un PDF; se prepara de antemano para que el servidor de
  // desarrollo no recargue la página (y pierda el archivo elegido) la primera vez.
  optimizeDeps: {
    include: ['pdfjs-dist/legacy/build/pdf.mjs'],
  },
  test: {
    environment: 'node',
  },
});
