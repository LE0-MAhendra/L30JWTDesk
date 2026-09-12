import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1421, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'safari13',
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: ['@uiw/react-codemirror', '@codemirror/lang-json', '@codemirror/view'],
          ui: ['@radix-ui/react-tooltip', 'gsap', 'lucide-react', 'zustand'],
        },
      },
    },
  },
});
