#!/bin/sh
# Generate runtime configuration from environment variables
# This script runs at container startup before nginx starts

CONFIG_FILE="/usr/share/nginx/html/config.js"
INDEX_FILE="/usr/share/nginx/html/index.html"

# Construct script path using BASE_PATH
SCRIPT_PATH="${BASE_PATH%/}/config.js"

# Generate runtime config JavaScript
cat > "$CONFIG_FILE" << EOF
window.__RUNTIME_CONFIG__ = {
  oidc: {
    authority: "${OIDC_AUTHORITY:-}",
    client_id: "${OIDC_CLIENT_ID:-}",
    redirect_uri: "${OIDC_REDIRECT_URI:-}",
    scope: "${OIDC_SCOPE:-openid profile email}"
  },
  extraTokenParams: {
    app: "${OIDC_APP:-}"
  },
  api: {
    baseUrl: "${API_BASE_URL:-}",
    notificationUrl: "${NOTIFICATION_API_URL:-}",
    signalRHubUrl: "${SIGNALR_HUB_URL:-}"
  },
  version: "${APP_VERSION:-unknown}",
  packageVersions: {},
  observability: {
    enabled: ${OBSERVABILITY_ENABLED:-false},
    loki: {
      url: "${LOKI_PROXY_URL:-${BASE_PATH:-}/edge/logs}"
    },
    tracing: {
      enabled: ${TRACING_ENABLED:-false},
      endpoint: "${TRACING_PROXY_URL:-${BASE_PATH:-}/edge/traces}",
      ignoreUrlsPattern: "${TRACING_IGNORE_URLS_PATTERN:-}"
    },
    metrics: {
      enabled: ${METRICS_ENABLED:-false},
      webVitals: true
    }
  },
  environment: "${NODE_ENV:-production}"
};
EOF

# Inject config.js script tag into index.html before </head> if not already present
if [ -f "$INDEX_FILE" ] && ! grep -q "config.js" "$INDEX_FILE"; then
  sed -i "s|</head>|<script src=\"$SCRIPT_PATH\"></script></head>|" "$INDEX_FILE"
fi

echo "Runtime config generated at $CONFIG_FILE"
