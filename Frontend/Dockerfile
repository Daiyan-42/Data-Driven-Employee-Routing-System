# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package.json first for layer caching
# Using npm with --legacy-peer-deps because react-leaflet 5 peer-requires
# React 19 while the project targets React 18.
COPY package.json ./
RUN npm install --legacy-peer-deps --no-audit

# Copy source
COPY . .

# VITE_API_BASE_URL is baked at build time.
# Set to /api so nginx proxies /api/* → backend container.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Stage 2: Serve ─────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (replaces default.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
