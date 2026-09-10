import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

const appVersion = pkg.version;
const isWatchBuild = process.argv.includes('--watch') || process.argv.includes('-w');

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    svelte(),
    {
      name: 'emit-version-file',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: `${JSON.stringify({ version: appVersion }, null, 2)}\n`,
        });
      },
    },
  ],
  publicDir: false,
  build: {
    chunkSizeWarningLimit: 600,
    emptyOutDir: !isWatchBuild,
    minify: true,
    outDir: 'dist',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'svelte',
              test: /node_modules[\\/]svelte/,
              priority: 2,
            },
            {
              name: 'firebase',
              test: /node_modules[\\/](@firebase|firebase)/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
  server: {
    host: 'localhost',
    port: 5174,
  },
  preview: {
    host: 'localhost',
    port: 4173,
  },
});
