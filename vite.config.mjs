import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/monopoly/' : '/',
  build: {
    outDir: './build',
  },
  server: {
    // Opening a browser is right for `pnpm dev` and wrong everywhere else:
    // Playwright starts this same server, and on CI there is no browser to
    // open - the spawn just fails or hangs the job.
    port: 3000,
    open: !process.env.CI,
  },
  publicDir: 'public',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: 'src/setupTests.ts',
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
  plugins: [react(), nxViteTsPaths()],
});
