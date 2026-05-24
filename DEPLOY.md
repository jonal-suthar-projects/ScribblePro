# Deploy ScribblePro (free tier)

Stack: **Cloudflare Pages** (frontend) + **Render** (backend + Socket.IO).

## 1. Environment variables

| Variable | Where | Example |
|----------|--------|---------|
| `VITE_SOCKET_URL` | Cloudflare Pages (build) | `https://scribblepro-api.onrender.com` |
| `CLIENT_URL` | Render (runtime) | `https://scribblepro.pages.dev` |
| `CLIENT_URLS` | Render (optional) | `https://preview.pages.dev` |

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

## 3. Frontend — Cloudflare (Pages or Workers)

Set **`VITE_SOCKET_URL`** = your Render API URL (no trailing slash) before building.

- **Workers (`wrangler deploy`)**: `client/.env.production` is used by `npm run build`. Root `wrangler.jsonc` must point at **`client/dist`**, not `client/` (serving the dev `index.html` causes a white screen).
- **Cloudflare Pages**: set `VITE_SOCKET_URL` under **Settings → Environment variables** before deploying.

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
- `client/public/_redirects` enables SPA routing on static hosts.
- 8–10 players is well within free tier limits.
