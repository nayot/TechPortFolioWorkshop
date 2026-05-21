# TechPortFolioWorkshop — Claude Code Briefing

## What this app is

An Express + vanilla-JS web app that helps Maejo University faculty build Technology Portfolios for a Deep Mentorship Program. It uses Google OAuth for auth and OpenRouter (Gemini 2.5 Flash) for AI suggestions.

## Deployment

- **Production URL:** `https://eng-ai.buu.ac.th/techfolio`
- **Docker container:** `maejo-portfolio`, port `3000` internally, bound to `127.0.0.1:3010` on the host.
- **Reverse proxy:** nginx at `/etc/nginx/includes/techfolio.conf` strips the `/techfolio/` prefix and forwards to `127.0.0.1:3010/`.
- **Env vars:** loaded from `.env` via `env_file` in `docker-compose.yml`.

## Sub-path constraint — read this before touching any URLs

The app is served under the path prefix `/techfolio/`, not at the domain root. The nginx proxy strips this prefix internally, so the Express app itself always receives paths starting at `/`. This creates one strict rule:

**All URLs in the frontend must be relative (no leading `/`).**

### Static assets in `public/index.html`

```html
<!-- CORRECT — relative, works under any prefix -->
<link rel="stylesheet" href="style.css" />
<script src="app.js"></script>

<!-- WRONG — absolute, breaks under /techfolio/ -->
<link rel="stylesheet" href="/style.css" />
<script src="/app.js"></script>
```

### API calls in `public/app.js`

```js
// CORRECT
const cfg = await api('api/config');
await api('api/auth/me');
await api('api/auth/google', { method: 'POST', … });
await api('api/auth/logout', { method: 'POST' });
return api('api/suggest', { method: 'POST', … });

// WRONG
const cfg = await api('/api/config');
```

The `api()` helper calls `fetch(path, …)`. Relative URLs resolve against the current page (`https://eng-ai.buu.ac.th/techfolio/`), so `api('api/config')` correctly becomes `https://eng-ai.buu.ac.th/techfolio/api/config`, which nginx then proxies as `/api/config` to the Express app.

If you add new API calls or new `<link>`/`<script>` tags, always use relative paths.

### Server-side routes

Express routes (`/api/*`) are unaffected — the proxy strips the prefix before the request reaches Node, so keep them as-is.

## Development workflow

```bash
# Start / rebuild after any file change
docker compose build && docker compose up -d

# View logs
docker compose logs -f

# Quick restart without rebuild (server.js changes only need this)
docker compose restart
```

Static files (`public/`) are baked into the Docker image at build time — **always rebuild after editing them.**

## Key files

| Path | Purpose |
|------|---------|
| `server.js` | Express server — auth, session, `/api/*` routes |
| `public/index.html` | Single-page UI |
| `public/app.js` | All client-side logic |
| `public/style.css` | Styles |
| `docker-compose.yml` | Container definition |
| `.env` | Secrets — never commit |

## Environment variables (`.env`)

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `SESSION_SECRET` | Express session signing secret |
| `PORT` | Internal port (keep `3000`) |
| `ALLOWED_ORIGIN` | CORS origin — must be `https://eng-ai.buu.ac.th` |

## nginx config locations

- Include file: `/etc/nginx/includes/techfolio.conf`
- Host vhost: `/etc/nginx/sites-available/eng-ai.buu.ac.th`

After editing nginx files: `sudo nginx -t && sudo nginx -s reload`
