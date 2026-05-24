/**
 * Reset client/index.html before Vite build. CI build-cache may restore a
 * production index.html from a prior staging step, which breaks vite build.
 */
import { copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const client = join(dirname(fileURLToPath(import.meta.url)), '..', 'client');
const devIndex = join(client, 'index.dev.html');
const index = join(client, 'index.html');

if (!existsSync(devIndex)) {
  console.error('[ensure-dev-index] Missing client/index.dev.html');
  process.exit(1);
}

copyFileSync(devIndex, index);
