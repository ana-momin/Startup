import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const resolvePath = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // Two entry points: the app people use, and the bare surface the renderer
        // photographs. Both are built so exporting works from a production build too.
        main: resolvePath('./index.html'),
        render: resolvePath('./render.html'),
      },
    },
  },
  resolve: {
    alias: {
      // Our engine lives in its own package so the future render server can use the
      // exact same code as the browser preview. One source of truth, no copy-paste.
      '@motion/engine': resolvePath('../../packages/engine/src/index.ts'),
      '@motion/planner': resolvePath('../../packages/planner/src/index.ts'),
      '@': resolvePath('./src'),
    },
  },
  server: {
    // The engine sits outside this app's folder, so Vite needs permission to read it.
    fs: { allow: [resolvePath('../..')] },
    /*
     * Listen on every interface, not just the loopback.
     *
     * Without this the studio is reachable only from the machine running it, so the one
     * test that matters most for a video tool — watching it on a phone — cannot be done
     * at all. Vite prints the network address on start.
     */
    host: true,
  },
});
