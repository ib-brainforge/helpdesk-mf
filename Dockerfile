# Stage 1: Build the application (includes type generation)
FROM node:18-alpine AS app-builder

WORKDIR /build

# Install pnpm globally
RUN npm install -g pnpm

# Set up npm authentication for GitHub Packages
ARG NPM_TOKEN
ARG APP_VERSION=unknown
RUN echo "@brainforgeau:registry=https://npm.pkg.github.com" > /root/.npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> /root/.npmrc

# Copy package files first (for better layer caching)
COPY package*.json pnpm-lock.yaml .npmrc ./

# Copy config files needed for type generation
COPY modern.config.ts module-federation.config.ts tsconfig.json postcss.config.mjs biome.json ./

# Create minimal source structure for type generation
RUN mkdir -p src/routes && \
    echo "import { Outlet } from '@modern-js/runtime/router'; export default function Layout() { return (<div><Outlet /></div>); }" > src/routes/layout.tsx && \
    echo "import './index.css'; const Index = () => (<div></div>); export default Index;" > src/routes/page.tsx && \
    echo "" > src/routes/index.css

# Single pnpm install (with mount cache for faster rebuilds)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy full source code (after dependencies are installed for better caching)
COPY . .

# Build the app for production deployment with optimizations
# Domain-agnostic: empty defaults, values injected at runtime via generate-config.sh
ENV NODE_ENV=production \
    OIDC_AUTHORITY="" \
    OIDC_CLIENT_ID="" \
    OIDC_REDIRECT_URI="" \
    OIDC_SCOPE="openid profile email" \
    API_BASE_URL="" \
    NOTIFICATION_API_URL="" \
    MFS_PACKAGES_URL="" \
    IDENTITY_BASE_URL="" \
    STANDALONE="true" \
    BASE_PATH="/helpdesk" \
    OBSERVABILITY_ENABLED="false" \
    TRACING_ENABLED="false" \
    TRACING_PROXY_URL="" \
    TRACING_IGNORE_URLS_PATTERN="" \
    LOKI_PROXY_URL="" \
    METRICS_ENABLED="false" \
    ENABLE_WHITELABEL="false" \
    APP_VERSION=${APP_VERSION}

RUN NODE_ENV=production pnpm run deploy

# Persist build-time version for runtime
RUN echo "${APP_VERSION}" > .app-version

# Stage 2: Production runtime with nginx + Node.js (BFF support)
FROM fholzer/nginx-brotli:latest

# Install Node.js and curl
RUN apk add --no-cache nodejs npm curl

WORKDIR /app

# Copy nginx static files
COPY --from=app-builder /build/.output/html/main /usr/share/nginx/html
COPY --from=app-builder /build/.output/static /usr/share/nginx/html/static

# Copy Node.js BFF server
COPY --from=app-builder /build/.output ./bff

# Copy build-time version file for runtime config
COPY --from=app-builder /build/.app-version /app/.app-version

# Copy nginx configuration template (will be processed at runtime)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy and make executable the runtime config generator
COPY generate-config.sh /generate-config.sh
RUN chmod +x /generate-config.sh

# Create entrypoint script to run generate-config.sh, nginx template processing, and BFF
# Generates random session secret, generates runtime config, and starts services
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'export BF_SESSION_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d "/+=" | head -c 32)' >> /entrypoint.sh && \
    echo '/generate-config.sh' >> /entrypoint.sh && \
    echo 'envsubst "\$BF_SESSION_SECRET" < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf' >> /entrypoint.sh && \
    echo 'cd /app/bff && node index.cjs &' >> /entrypoint.sh && \
    echo 'nginx -g "daemon off;"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Runtime environment variables (domain-agnostic — set via Kubernetes env/configmap)
ENV NODE_ENV=production \
    PORT=3000 \
    LOKI_URL="http://loki-proxy.brainforge.svc.cluster.local:3100" \
    TEMPO_ENDPOINT="http://tempo-proxy.brainforge.svc.cluster.local:4318/v1/traces" \
    ALLOWED_ORIGINS="" \
    OIDC_AUTHORITY="" \
    OIDC_CLIENT_ID="" \
    OIDC_REDIRECT_URI="" \
    OIDC_SCOPE="" \
    OIDC_APP="" \
    API_BASE_URL="" \
    NOTIFICATION_API_URL="" \
    SIGNALR_HUB_URL="" \
    OBSERVABILITY_ENABLED="false" \
    TRACING_ENABLED="false" \
    TRACING_PROXY_URL="" \
    TRACING_IGNORE_URLS_PATTERN="" \
    LOKI_PROXY_URL="" \
    METRICS_ENABLED="false" \
    BASE_PATH="/helpdesk" \
    APP_VERSION="unknown" \
    MFS_PACKAGES_URL="" \
    IDENTITY_BASE_URL="" \
    ENABLE_WHITELABEL="false"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
