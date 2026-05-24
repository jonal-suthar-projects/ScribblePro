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
   **or** **Web Service** → root directory `server`, start `npm start`.
3. Set `CLIENT_URL` to your live frontend URL.
4. Verify: `https://YOUR-API.onrender.com/health`

## 3. Frontend — Cloudflare Pages

1. **Workers & Pages** → **Create** → connect GitHub repo.
2. Root directory: `client`
3. Build: `npm install && npm run build`
4. Output: `dist`
5. Environment variable: `VITE_SOCKET_URL` = your Render URL.
6. Deploy. Update Render `CLIENT_URL` if needed, then retry frontend build.

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
