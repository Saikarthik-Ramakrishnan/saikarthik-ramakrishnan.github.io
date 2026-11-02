import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [svelte()],
  build: { rollupOptions: { input: fileURLToPath(new URL('./svelte/index.html', import.meta.url)) } },
});
