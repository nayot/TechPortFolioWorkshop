# TechPortFolioWorkshop — Claude Code Briefing

## What this app is

An 8-step AI-assisted Tech Portfolio wizard for the **Maejo University Deep Mentorship Program (FY2569)**. Faculty/researchers (future mentors for agriculture/food/health students) draft their Tech Portfolio one component at a time with AI suggestions, then assemble and export to Google Docs. A separate **Mentoring Plan** module drafts a 3-session AI-assisted mentoring plan per mentee project.

**The UI and all AI output are in Thai.** Prompt templates in `client/src/prompts.js` are written in Thai using the RTCF structure (Role/Task/Context/Format).

**Stack:**
- Frontend: React 18 + Vite 5 + Tailwind CSS (`client/`)
- Backend: Node.js 18+ + Express (`server.js`)
- AI: OpenRouter (configurable model via `OPENROUTER_MODEL`)
- Auth: Google OAuth 2.0 — server-side authorization-code flow, optional email allowlist
- Persistence: Google Drive JSON files (no database); sessions on disk via `session-file-store`

## The 8 portfolio steps

| # | Step (id) | AI behavior |
|---|-----------|-------------|
| 1 | **Profile** (`profile`) | Extract CV → prefill fields + draft positioning statement |
| 2 | **Skills** (`skills`) | Suggest skills list → user selects → AI writes statement |
| 3 | **Projects** (`projects`) | Extract + rank projects from CV → user selects |
| 4 | **Process** (`process`) | Suggest process descriptors → user selects |
| 5 | **Evidence** (`evidence`) | Rank evidence (pubs/patents/grants) from CV → user selects |
| 6 | **Impact** (`impact`) | Suggest impact statements → user selects + adds |
| 7 | **Commercialization Gaps** (`commercialization`) | Diagnostic panel — AI identifies gaps, per-card inline editing |
| 8 | **Reflection** (`reflection`) | Draft reflection statement → user edits → AI polishes |

The canonical step list is the `STEPS` array in `client/src/prompts.js`. "ดูภาพรวม Portfolio" (Assembly) unlocks only when all 8 steps are complete.

## Mentoring Plan module

Separate page (`mentoringPlan` in the top-level router) that builds an AI-assisted mentoring plan from a completed portfolio: an overview plus 3 sessions (สำรวจและสร้างความไว้วางใจ / เจาะลึกและพัฒนา / วางแผนก้าวต่อไป), each with goal, diagnostic questions, gaps to close, and success markers.

- `client/src/pages/MentoringPlanPage.jsx` — page logic
- `client/src/prompts/mentoringPlanPrompts.js` — overview / full-draft / single-field prompts
- `client/src/components/mentoringPlan/` — `OverviewPanel.jsx`, `SessionPanel.jsx`

## Local development (no Docker)

```bash
# First time: add GOOGLE_CLIENT_SECRET to .env (see below)
npm install

# Start both servers concurrently:
npm run dev

# Or start individually:
npm run dev:server   # Express on :3000 (nodemon, watches server.js only)
npm run dev:client   # Vite on :5173
```

Open `http://localhost:5173`. The Vite dev server proxies all `/api/*` to `http://localhost:3000`.

Sessions are stored in `./sessions/` (7-day TTL), so login survives server restarts.

## Production (Docker)

```bash
# Build and start
docker compose build && docker compose up -d

# View logs
docker compose logs -f

# Quick restart (server.js only)
docker compose restart
```

Production URL: `https://eng-ai.buu.ac.th/techportfolio`

- The container binds to `127.0.0.1:3010` (host) → `3000` (container); it is reachable only via the nginx reverse proxy.
- The frontend is built with `VITE_BASE=/techportfolio/` (Dockerfile build arg, set in `docker-compose.yml`); `client/vite.config.js` reads `base` from `VITE_BASE` (defaults to `/`).
- A named volume `sessions` persists login sessions across container restarts.
- The nginx proxy strips the `/techportfolio/` prefix so Express always sees paths starting at `/`. **All frontend URLs must be relative** (no leading `/`).

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
| `ALLOWED_EMAILS` | Comma-separated email allowlist; **empty = open access** |

## Google Cloud setup (one-time)

1. Create a Google Cloud project
2. Enable the **Google Drive API** and **Google OAuth2 API**
3. Configure the OAuth consent screen (add `drive.file` scope)
4. Create an OAuth 2.0 client (Web application), add the redirect URI
5. Copy client ID + secret to `.env`

## Key files

| Path | Purpose |
|------|---------|
| `server.js` | Express API — auth, Drive CRUD, AI proxy (rate-limited), CV parse |
| `client/src/App.jsx` | Top-level router (login → projects → wizard → assembly → mentoring plan) |
| `client/src/prompts.js` | `STEPS` array + Thai RTCF prompt templates for all 8 steps — edit here to tune AI output |
| `client/src/prompts/mentoringPlanPrompts.js` | Mentoring Plan prompt templates |
| `client/src/components/AIStepPanel.jsx` | Reusable step UI (editable prompt, generate, rewrite, output, save) |
| `client/src/steps/Step1Profile.jsx` … `Step8CommercializationGaps.jsx` | Per-step components |
| `client/src/pages/AssemblyPage.jsx` | Portfolio assembly + Google Docs export + infographic brief |
| `client/src/pages/MentoringPlanPage.jsx` | AI-assisted mentoring plan per mentee project |
| `docs/` | LaTeX source for the Deep Mentor workshop participant manual |

## API routes

All `/api/projects*`, `/api/ai/*`, and `/api/cv/*` routes require an authenticated session.

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Health check |
| `GET /api/config` | Returns the active AI model slug (shown as a header badge) |
| `GET /api/auth/google` | Start OAuth flow (redirects to Google) |
| `GET /api/auth/google/callback` | OAuth callback (enforces `ALLOWED_EMAILS`) |
| `GET /api/auth/me` | Current user or 401 |
| `POST /api/auth/logout` | Destroy session |
| `POST /api/ai/complete` | AI proxy → OpenRouter (rate-limited, 429 retry on client) |
| `GET /api/projects` | List `.techport.json` files in Drive |
| `POST /api/projects` | Create new project file |
| `GET /api/projects/:id` | Load project |
| `PUT /api/projects/:id` | Save/autosave project |
| `DELETE /api/projects/:id` | Delete project (confirmation in UI) |
| `POST /api/projects/:id/export-doc` | Export portfolio as Google Doc |
| `POST /api/cv/upload` | Upload + parse PDF/DOCX CV |

## Sub-path constraint (production)

The app is served under `/techportfolio/`. The nginx proxy strips the prefix internally so Express always sees paths starting at `/`. The Docker build sets `VITE_BASE=/techportfolio/` so static asset references resolve correctly; in dev, `base` defaults to `/`.

When adding frontend fetches or asset references, keep URLs relative (no leading `/`) so they work under both `/` (dev) and `/techportfolio/` (production).

## nginx config (production host)

- Include file: `/etc/nginx/includes/techportfolio.conf`
- Host vhost: `/etc/nginx/sites-available/eng-ai.buu.ac.th`

After editing: `sudo nginx -t && sudo nginx -s reload`
