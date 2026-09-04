#!/usr/bin/env node
/**
 * Serves `build/` the way GitHub Pages does, so a routing bug can be caught
 * before it is deployed.
 *
 * The dev server cannot: Vite falls back to index.html for any path it does
 * not recognise, which is exactly the behaviour a static host does NOT have.
 * That fallback is why `/rules` looked fine locally for as long as it was
 * broken in production.
 *
 * So the one rule here is: serve a file, or 404. No history fallback, no
 * `404.html`. Everything is served under the same `/monopoly/` base the
 * production build is compiled for, because a base mismatch is its own class
 * of bug and testing without one would not find it.
 *
 * Usage: node tools/serve-build.mjs [port]
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../build/', import.meta.url));
const BASE = '/monopoly/';
const PORT = Number(process.argv[2] ?? 3200);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/**
 * The path on disk for a request, or null when the request escapes the build
 * directory or falls outside the base.
 */
const resolveFile = (url) => {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);

  // GitHub Pages serves this project under a sub-path. Anything outside it is
  // a 404 there, and must be a 404 here.
  if (!pathname.startsWith(BASE)) {
    return null;
  }

  let relative = pathname.slice(BASE.length);
  if (relative === '' || relative.endsWith('/')) {
    relative += 'index.html';
  }

  const resolved = normalize(join(ROOT, relative));
  return resolved.startsWith(ROOT) ? resolved : null;
};

const server = createServer(async (request, response) => {
  const file = resolveFile(request.url);

  if (file === null) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('404 Not Found');
    return;
  }

  try {
    const stats = await stat(file);
    if (!stats.isFile()) {
      throw new Error('not a file');
    }
    response.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
      'content-length': stats.size,
    });
    createReadStream(file).pipe(response);
  } catch {
    // No history fallback on purpose - this is the whole point of the file.
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('404 Not Found');
  }
});

server.listen(PORT, 'localhost', () => {
  console.log(`serving build/ at http://localhost:${PORT}${BASE}`);
});
