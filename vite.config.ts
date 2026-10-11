import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      // Every route is prerendered; 404.html lets GitHub Pages serve the app for unknown paths.
      adapter: adapter({ fallback: '404.html' }),
    }),
  ],
});
