import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/trip-bill/',
  build: {
    rollupOptions: {
      input: {
        overview: 'index.html',
        assets: 'assets.html',
        advice: 'advice.html',
        ledger: 'ledger.html',
        payment: 'payment.html',
        record: 'record.html',
        settings: 'settings.html',
      },
    },
  },
});
