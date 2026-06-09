# TechPortFolioWorkshop — Claude Code Briefing

## What this app is

A 7-step AI-assisted Tech Portfolio wizard for the **Maejo University Deep Mentorship Program (FY2569)**. Faculty/researchers draft their Tech Portfolio one component at a time with AI suggestions, then assemble and export to Google Docs.

**Stack:**
- Frontend: React 18 + Vite 5 + Tailwind CSS (`client/`)
- Backend: Node.js 18+ + Express (`server.js`)
- AI: OpenRouter (configurable model via `OPENROUTER_MODEL`)
- Auth: Google OAuth 2.0 — server-side authorization-code flow
- Persistence: Google Drive JSON files (no database)

## The 7 portfolio components

| # | Component | AI behavior |
|---|-----------|-------------|
| 1 | **Profile** | Extract CV → prefill fields + draft positioning statement |
| 2 | **Skills** | Suggest skills list → user selects → AI writes statement |
| 3 | **Projects** | Extract + rank projects from CV → user selects |
| 4 | **Process** | Suggest process descriptors → user selects |
| 5 | **Evidence** | Rank evidence (pubs/patents/grants) from CV → user selects |
| 6 | **Impact** | Suggest impact statements → user selects + adds |
| 7 | **Reflection** | Draft reflection statement → user edits → AI polishes |

## Local development (no Docker)

```bash
# First time: add GOOGLE_CLIENT_SECRET to .env (see below)
npm install

# Start both servers concurrently:
npm run dev

# Or start individually:
npm run dev:server   # Express on :3000
npm run dev:client   # Vite on :5173
```

Open `http://localhost:5173`. The Vite dev server proxies all `/api/*` to `http://localhost:3000`.

## Production (Docker)

```bash
# Build and start
docker compose build && docker compose up -d

# View logs
docker compose logs -f

# Quick restart (server.js only)
docker compose restart
```

Production URL: `https://eng-ai.buu.ac.th/techfolio`

The nginx reverse proxy strips the `/techfolio/` prefix. **All frontend URLs must be relative** (no leading `/`) — see the sub-path section below.

## Environment variables (`.env`)

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Model slug (default: `qwen/qwen3-235b-a22b`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (**required for auth**) |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL (`http://localhost:3000/api/auth/google/callback` in dev) |
| `SESSION_SECRET` | Express session signing secret |
| `PORT` | Express port (keep `3000`) |
| `ALLOWED_ORIGIN` | CORS + redirect target (`http://localhost:5173` in dev) |

## Google Cloud setup (one-time)

1. Create a Google Cloud project
2. Enable the **Google Drive API** and **Google OAuth2 API**
3. Configure the OAuth consent screen (add `drive.file` scope)
4. Create an OAuth 2.0 client (Web application), add the redirect URI
5. Copy client ID + secret to `.env`

## Key files

| Path | Purpose |
|------|---------|
| `server.js` | Express API — auth, Drive CRUD, AI proxy, CV parse |
| `client/src/App.jsx` | Top-level router (login → projects → wizard → assembly) |
| `client/src/prompts.js` | RTCF prompt templates for all 7 steps — edit here to tune AI output |
| `client/src/components/AIStepPanel.jsx` | Reusable step UI (editable prompt, generate, output, save) |
| `client/src/steps/Step1Profile.jsx` … `Step7Reflection.jsx` | Per-step components |
| `client/src/pages/AssemblyPage.jsx` | Portfolio assembly + Google Docs export + infographic brief |

## API routes

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Health check |
| `GET /api/auth/google` | Start OAuth flow (redirects to Google) |
| `GET /api/auth/google/callback` | OAuth callback |
| `GET /api/auth/me` | Current user or 401 |
| `POST /api/auth/logout` | Destroy session |
| `POST /api/ai/complete` | AI proxy → OpenRouter |
| `GET /api/projects` | List `.techport.json` files in Drive |
| `POST /api/projects` | Create new project file |
| `GET /api/projects/:id` | Load project |
| `PUT /api/projects/:id` | Save/autosave project |
| `POST /api/projects/:id/export-doc` | Export portfolio as Google Doc |
| `POST /api/cv/upload` | Upload + parse PDF/DOCX CV |

## Sub-path constraint (production)

The app is served under `/techfolio/`. The nginx proxy strips the prefix internally so Express always sees paths starting at `/`. In production builds from `client/dist/`, React's asset references are already relative.

In `client/vite.config.js`, set `base: '/techfolio/'` for a production Docker build if static assets are served directly (not needed when Express serves them from `client/dist/`).

## nginx config

- Include file: `/etc/nginx/includes/techfolio.conf`
- Host vhost: `/etc/nginx/sites-available/eng-ai.buu.ac.th`

After editing: `sudo nginx -t && sudo nginx -s reload`
