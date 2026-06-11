# ── Stage 1: Build React client ──────────────────────────────────────────────
FROM node:20-alpine AS client-builder

ARG VITE_BASE=/techportfolio/

WORKDIR /build
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN VITE_BASE=${VITE_BASE} npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./
COPY public ./public
COPY --from=client-builder /build/dist ./client/dist

RUN mkdir -p /app/sessions && chown -R node:node /app/sessions

USER node

EXPOSE 3000

CMD ["node", "server.js"]
