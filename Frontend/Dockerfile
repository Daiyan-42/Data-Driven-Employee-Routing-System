# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Enable pnpm via corepack (no separate install needed)
RUN corepack enable pnpm

WORKDIR /app

# Copy lockfiles first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# VITE_API_BASE_URL is baked at build time.
# Set to /api so nginx proxies /api/* → backend container.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm build

# ── Stage 2: Serve ─────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (replaces default.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
