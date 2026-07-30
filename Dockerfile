# --- Multi-stage Dockerfile for Lunar AI Code Review Platform ---

# Stage 1: Build React Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app

ARG VITE_SUPABASE_URL=""
ARG PUBLIC_SUPABASE_ANON_TOKEN=""

COPY package*.json ./
RUN npm ci --include=optional
COPY . .
RUN VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
    VITE_SUPABASE_ANON_KEY="$PUBLIC_SUPABASE_ANON_TOKEN" \
    npm run build

# Stage 2: Production Express Backend + Static Assets
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./

RUN npm ci --omit=dev --include=optional \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx \
    && corepack disable \
    && rm -rf /usr/local/lib/node_modules/corepack

COPY server ./server
COPY --from=frontend-builder /app/dist ./dist

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -q --timeout=2 -O - http://127.0.0.1:5000/api/v1/ready >/dev/null || exit 1

STOPSIGNAL SIGTERM

CMD ["node", "server/index.js"]
