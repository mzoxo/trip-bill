import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        overview: 'index.html',
        advice: 'advice.html',
        ledger: 'ledger.html',
        settings: 'settings.html',
      },
    },
  },
});
