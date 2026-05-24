const LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

/**
 * Allowed browser origins for HTTP + Socket.IO (from env + local dev).
 * CLIENT_URL — primary frontend (e.g. https://scribblepro.pages.dev)
 * CLIENT_URLS — optional comma-separated extras (preview URLs, custom domain)
 */
export function getAllowedOrigins() {
  const fromEnv = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URLS,
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return [...new Set([...LOCAL_ORIGINS, ...fromEnv])];
}

export function isOriginAllowed(origin, allowed) {
  if (!origin) return true;
  return allowed.includes(origin.replace(/\/$/, ''));
}
