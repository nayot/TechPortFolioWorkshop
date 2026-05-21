# Maejo Deep Mentorship — Technology Portfolio (Step 1: Profile)

Demo web app for Maejo University's Deep Mentorship Program (FY2569). Faculty researchers sign in with Google, enter their profile + expertise + optional CV, and the app calls an AI model via a server-side proxy to generate a Technology Portfolio profile section.

This repo contains **Step 1 of 6 (Profile)**.

---

## Prerequisites

- Node.js **18+** (uses the built-in `fetch`)
- A Google OAuth Client ID (Web application type)
- An OpenRouter API key with a spending limit set

---

## Setup

```bash
npm install
cp .env.example .env
```

Then edit `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
GOOGLE_CLIENT_ID=xxxxxxxx-xxxxxxxxxxxxxxxxx.apps.googleusercontent.com
SESSION_SECRET=<a long random string>
PORT=3000
ALLOWED_ORIGIN=http://localhost:3000
```

### Get a Google Client ID

1. Open https://console.cloud.google.com/apis/credentials
2. Create OAuth client → **Web application**
3. Under **Authorized JavaScript origins**, add: `http://localhost:3000`
4. (No redirect URI is needed — Google Identity Services uses the JS-origin flow.)
5. Copy the **Client ID** into `GOOGLE_CLIENT_ID` in `.env`.

### Get an OpenRouter key

1. Sign in at https://openrouter.ai
2. Create a key.
3. **Set a spending limit on the key** in the OpenRouter dashboard before sharing it with anyone or running a workshop. This is the single most important safety step.
4. Copy the key into `OPENROUTER_API_KEY` in `.env`.

### Generate a session secret

Any long random string works. For example:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Put the output into `SESSION_SECRET`.

---

## Run locally

```bash
node server.js
```

Open http://localhost:3000 in a browser. You should see the Google sign-in card. After signing in, the portfolio form appears.

---

## Replacing the OpenRouter key before the workshop

1. Edit `.env` and set the new `OPENROUTER_API_KEY`.
2. Restart the server (`Ctrl-C`, then `node server.js`).
3. **Reminder:** verify the new key has a spending cap set in the OpenRouter dashboard.

---

## Deployment (generic)

For a small VM (e.g. DigitalOcean / EC2):

1. Install Node 18+ and clone the repo.
2. Create `.env` with production values:
   - `ALLOWED_ORIGIN=https://yourdomain.com`
   - A strong `SESSION_SECRET`
3. Update your Google OAuth client in Google Cloud Console: add `https://yourdomain.com` as an Authorized JavaScript origin.
4. Run under PM2:
   ```bash
   npm install --omit=dev
   npm install -g pm2
   NODE_ENV=production pm2 start server.js --name maejo-portfolio
   pm2 save
   ```
   When `NODE_ENV=production`, the session cookie is sent with `Secure`, so the app must be served over HTTPS.
5. Put nginx in front as a reverse proxy with TLS:
   ```nginx
   server {
     server_name yourdomain.com;
     listen 443 ssl;
     # ssl_certificate / ssl_certificate_key ...

     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```
6. For multiple instances or restarts, replace the default in-memory session store with Redis (e.g. `connect-redis`).

---

## Project structure

```
maejo-portfolio/
├── server.js              # Express proxy + auth
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/api/config`      | no  | Returns `{ googleClientId }` for the frontend GIS init. |
| GET  | `/api/auth/me`     | no  | Returns the current session user, or 401. |
| POST | `/api/auth/google` | no  | Verifies a Google ID token and starts a session. |
| POST | `/api/auth/logout` | no  | Destroys the session. |
| POST | `/api/suggest`     | yes | Proxies a chat-completion request to OpenRouter. Rate-limited to 20 req/min/IP. |
