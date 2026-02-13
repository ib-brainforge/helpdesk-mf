import { appTools, defineConfig } from '@modern-js/app-tools';
import { bffPlugin } from '@modern-js/plugin-bff';
import CompressionPlugin from 'compression-webpack-plugin';
import { moduleFederationPlugin } from '@module-federation/modern-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Check if running as microfrontend (default) or standalone
const isStandalone = process.env.STANDALONE === 'true';
const basePath = process.env.BASE_PATH || '';

// Extract @brainforgeau package versions from package.json
function getBrainforgePackageVersions(): Record<string, string> {
  try {
    const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const versions: Record<string, string> = {};
    for (const [name, version] of Object.entries(deps)) {
      if (name.startsWith('@brainforgeau/')) {
        // Remove ^ or ~ prefix from version
        versions[name] = String(version).replace(/^[\^~]/, '');
      }
    }
    return versions;
  } catch {
    return {};
  }
}

const packageVersions = getBrainforgePackageVersions();

const config = {
  oidc: {
    authority: process.env.OIDC_AUTHORITY || '',
    client_id: process.env.OIDC_CLIENT_ID || '',
    redirect_uri: process.env.OIDC_REDIRECT_URI || '',
    scope: process.env.OIDC_SCOPE || 'openid profile email',
  },
  // Extra parameters for Keycloak token requests
  extraTokenParams: {
    app: process.env.OIDC_APP || 'helpdesk',
  },
  api: {
    baseUrl: process.env.API_BASE_URL || '',
    notificationUrl: process.env.NOTIFICATION_API_URL || '',
  },
  signalrHubUrl: process.env.SIGNALR_HUB_URL || '',
  // Docker image version passed at build time for observability
  version: process.env.APP_VERSION || 'unknown',
  // @brainforgeau package versions for observability tracking
  packageVersions,
  observability: {
    enabled: process.env.OBSERVABILITY_ENABLED === 'true',
    loki: {
      // Use BFF proxy URL to keep credentials server-side
      // Include basePath so requests go to /helpdesk/edge/logs in production
      url: process.env.LOKI_PROXY_URL || `${basePath}/edge/logs`,
    },
    tracing: {
      enabled: process.env.TRACING_ENABLED === 'true',
      // Use BFF proxy URL to keep credentials server-side
      // Include basePath so requests go to /helpdesk/edge/traces in production
      endpoint: process.env.TRACING_PROXY_URL || `${basePath}/edge/traces`,
      // Domains to exclude from trace header propagation (to avoid CORS issues)
      ignoreUrlsPattern: process.env.TRACING_IGNORE_URLS_PATTERN || '',
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      webVitals: true,
      // Metrics are logged to Loki as structured data
    },
  },
  environment: process.env.NODE_ENV || 'development'
};

console.log('Helpdesk Modern Config, isStandalone:', isStandalone);
console.log('Helpdesk Modern Config, config:', config);

export default defineConfig({
  runtime: {
    router: process.env.BASE_PATH ? {
      basename: process.env.BASE_PATH,
    } : true,
  },
  server: {
    baseUrl: process.env.BASE_PATH || '/',
  },
  output: {
    assetPrefix: process.env.BASE_PATH ? `${process.env.BASE_PATH}/` : '/',
    sourceMap: {
      // Disable source maps in production to reduce bundle size
      js: process.env.NODE_ENV === 'production' ? false : 'source-map',
      css: process.env.NODE_ENV === 'production' ? false : true,
    },
  },
  dev: {
    port: 8087,
  },
  resolve: {
    // Force single Jotai instance in standalone mode via aliases
    ...(isStandalone ? {
      alias: {
        'jotai': require.resolve('jotai'),
        'jotai/react': require.resolve('jotai/react'),
        'jotai/vanilla': require.resolve('jotai/vanilla'),
        'jotai/utils': require.resolve('jotai/utils'),
        'jotai/react/utils': require.resolve('jotai/react/utils'),
      }
    } : {}),
  },
  source: {

    // Expose environment variables to client-side code as config object
    // Namespaced to avoid conflicts when multiple microfrontends are loaded
    globalVars: {
      '__HELPDESK_CONFIG__': JSON.stringify(config),
      '__HELPDESK_STANDALONE__': isStandalone,
      '__IDENTITY_BASE_URL__': process.env.IDENTITY_BASE_URL || '',
    },
  },
  // Performance optimizations
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
    },
    printFileSize: {
      compressed: true,
    },
  },
  plugins: [
    appTools({
      bundler: 'rspack',
    }),
    bffPlugin(),
    moduleFederationPlugin()
  ],
  bff: {
    prefix: '/edge',
  },
  tools: {
    rspack: (config, { appendPlugins }) => {
      // Production optimizations
      if (process.env.NODE_ENV === 'production') {
        config.mode = 'production';

        // Enable optimizations
        config.optimization = {
          ...config.optimization,
          minimize: true,
          sideEffects: false,
          usedExports: true,
          concatenateModules: true,
          runtimeChunk: 'single',
          moduleIds: 'deterministic',
          chunkIds: 'deterministic'
        };

        // Set performance hints
        config.performance = {
          hints: 'warning',
          maxEntrypointSize: 512000,
          maxAssetSize: 256000,
        };

        // Add compression plugins for production
        appendPlugins([
          new CompressionPlugin({
            filename: '[path][base].gz',
            algorithm: 'gzip',
            test: /\.(js|css|html|svg|json)$/,
            threshold: 10240, // Only compress files larger than 10KB
            minRatio: 0.8,
          }),
          new CompressionPlugin({
            filename: '[path][base].br',
            algorithm: 'brotliCompress',
            test: /\.(js|css|html|svg|json)$/,
            threshold: 10240,
            minRatio: 0.8,
            compressionOptions: {
              level: 11,
            },
          }),
        ]);
      }


      return config;
    },
  },
});
