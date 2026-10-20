import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Main portfolio is the static page in public/index.html; the Svelte app lives at /alt/.
export default defineConfig({
  plugins: [svelte()],
  build: { rollupOptions: { input: 'alt/index.html' } },
});
