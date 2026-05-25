# Deploy ScribblePro (free tier)

Stack: **Cloudflare Pages** (frontend) + **Render** (backend + Socket.IO).

## 1. Environment variables

| Variable | Where | Example |
|----------|--------|---------|
| `VITE_SOCKET_URL` | Cloudflare Pages (build) | `https://scribblepro-api.onrender.com` |
| `CLIENT_URL` | Render (runtime) | `https://scribblepro.pages.dev` |
| `CLIENT_URLS` | Render (optional) | `https://preview.pages.dev` |
| `REDIS_URL` | Render (recommended) | Upstash **Redis URL** (`rediss://…`) |

`REDIS_URL` keeps rooms and sessions alive across Render restarts and enables reliable reconnects. Without it, the server falls back to in-memory state (fine for local dev only).

No trailing slashes. After changing `VITE_SOCKET_URL`, redeploy the frontend.

## 2. Backend — Render

1. Push repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** (uses `render.yaml`)  
   **or** **Web Service** with:
   - **Root directory:** `server`
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
3. Set `CLIENT_URL` to your live frontend URL.
4. Verify: `https://YOUR-API.onrender.com/health`

## 3. Frontend — Cloudflare Workers (Git builds)

Set **`VITE_SOCKET_URL`** in `client/.env.production` (or Cloudflare build env vars).

### Workers Builds (dashboard → Settings → Builds)

| Setting | Value |
|---------|--------|
| **Root directory** | *(empty — repo root)* |
| **Build command** | `npm run build` |
| **Deploy command** | `npm run cf:deploy` |

`wrangler.jsonc` deploys **`client/dist`** only (never overwrite `client/index.html` for deploy). Do **not** add `--assets ./client`.

Build resets `client/index.html` from `index.dev.html` before Vite (fixes CI cache). Confirm log shows `✓ built` then deploy reads `client/dist`.

### Cloudflare Pages

Set `VITE_SOCKET_URL` under **Settings → Environment variables**, then use Option A below.

### Option A — Recommended (build inside `client/`)

| Setting | Value |
|---------|--------|
| **Root directory** | `client` |
| **Build command** | `npm install && npm run build` (use `npm install`, not `npm ci`) |
| **Build output directory** | `dist` |

### Option B — Repo root (uses root `package.json`)

| Setting | Value |
|---------|--------|
| **Root directory** | `/` (leave empty or `.`) |
| **Build command** | `npm run build` |
| **Build output directory** | `client/dist` |

The root `npm run build` runs `npm ci` in `client/` first so Vite and React are installed.

6. Deploy. Set Render `CLIENT_URL` to your `*.pages.dev` URL, then redeploy backend if needed.

## 4. Local production test

```bash
# Terminal 1 — server
cd server
cp .env.example .env
npm start

# Terminal 2 — client
cd client
cp .env.example .env.local
# Edit .env.local if needed
npm run build && npm run preview
```

## 5. Notes

- Render free tier sleeps after ~15 min idle; first load may take 30–60s.
- Workers SPA routing uses `not_found_handling` in `wrangler.jsonc` (do not add `client/public/_redirects` — it conflicts and breaks deploy).
- For Cloudflare Pages only, add `public/_redirects` with `/* /index.html 200`.
- 8–10 players is well within free tier limits.
