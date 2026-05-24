/**
 * Cloudflare Workers autoconfig deploys the `client/` folder. That folder also
 * contains the Vite dev index.html (loads /src/main.jsx), which causes a white
 * screen in production. After vite build, copy dist output to client/ root so
 * `/` serves the production bundle even when assets.directory is `client`.
 */
import { cpSync, existsSync, readFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const client = join(root, 'client');
const dist = join(client, 'dist');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('[stage-client-for-workers] Run vite build first (client/dist missing).');
  process.exit(1);
}

cpSync(join(dist, 'index.html'), join(client, 'index.html'));

const assetsSrc = join(dist, 'assets');
const assetsDest = join(client, 'assets');
if (existsSync(assetsDest)) rmSync(assetsDest, { recursive: true });
if (existsSync(assetsSrc)) {
  cpSync(assetsSrc, assetsDest, { recursive: true });
}

const favicon = join(dist, 'favicon.svg');
if (existsSync(favicon)) {
  cpSync(favicon, join(client, 'favicon.svg'));
}

const indexPath = join(client, 'index.html');
if (/src\/main\.jsx/.test(readFileSync(indexPath, 'utf8'))) {
  console.error('[stage-client-for-workers] client/index.html still references main.jsx — staging failed.');
  process.exit(1);
}

console.log('[stage-client-for-workers] Staged production assets to client/ for Workers deploy.');
