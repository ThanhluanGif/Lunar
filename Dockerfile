# --- Multi-stage Dockerfile for Lunar AI Code Review Platform ---

# Stage 1: Build React Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Express Backend + Static Assets
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./

RUN npm ci --omit=dev

COPY server ./server
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "server/index.js"]
