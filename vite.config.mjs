import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

/**
 * Hosts a tunnel is allowed to present.
 *
 * Vite refuses a request whose `Host` header it does not recognise - that is
 * its DNS-rebinding protection, and it is why an ngrok URL otherwise answers
 * "Blocked request. This host is not allowed." A leading dot matches the domain
 * and its subdomains, which is what a tunnel's generated name needs.
 *
 * Opt-in through an env var rather than a second dev script: there is one dev
 * server now, and the protection stays on for it by default - including for the
 * server the e2e suite starts. To tunnel:
 *
 *   ALLOW_TUNNEL_HOSTS=1 pnpm dev -- --host 0.0.0.0
 *   pnpm tunnel
 */
const TUNNEL_HOSTS = ['.ngrok-free.app', '.ngrok.app', '.ngrok-free.dev', '.ngrok.io'];

// https://vitejs.dev/config/
export default defineConfig(() => ({
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
    // Tunnelled only when asked for. `mode` used to decide this, which is why
    // there was a second dev script at all.
    allowedHosts: process.env.ALLOW_TUNNEL_HOSTS ? TUNNEL_HOSTS : undefined,
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
}));
