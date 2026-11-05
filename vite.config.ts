/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // pdf.js se carga solo al importar un PDF; se prepara de antemano para que el servidor de
  // desarrollo no recargue la página (y pierda el archivo elegido) la primera vez.
  optimizeDeps: {
    include: ['pdfjs-dist/legacy/build/pdf.mjs'],
  },
  test: {
    environment: 'node',
  },
});
