# syntax=docker/dockerfile:1
# Multi-stage production build for CHRONOS

# Stage 1: Build Application
FROM docker.io/library/node:24-alpine AS builder

WORKDIR /app

# Install dependencies with cached layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY public ./public
COPY src ./src

# Typecheck and produce optimized bundle
RUN npm run check
RUN npm run build

# Stage 2: Minimalist Production Nginx Runtime
FROM docker.io/library/nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom Nginx SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
