import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { appTools, defineConfig } from '@modern-js/app-tools';
import { bffPlugin } from '@modern-js/plugin-bff';
import { moduleFederationPlugin } from '@module-federation/modern-js';
import CompressionPlugin from 'compression-webpack-plugin';

// Check if running as microfrontend (default) or standalone
const isStandalone = process.env.STANDALONE === 'true';
const basePath = process.env.BASE_PATH || '';

/**
 * Resolve a package's ESM entry from its `exports["."].import.default` field.
 *
 * @tanstack/* packages ship dual ESM + CJS builds, each of which creates its
 * OWN React context (e.g. `QueryClientContext`). When app code imports the ESM
 * build (`import` condition) but a CJS-compiled dependency such as
 * @brainforgeau/components does `require('@tanstack/react-query')` (`require`
 * condition), webpack pulls in BOTH builds as distinct modules. The result is
 * two `QueryClientContext` objects: <QueryClientProvider> writes the client
 * into the ESM context, while `useQueryClient()` inside the page-template hooks
 * (useEntityForm / useListPage) reads the CJS context and finds nothing —
 * throwing "No QueryClient set, use QueryClientProvider to set one".
 *
 * Aliasing the bare specifier to the single ESM entry forces webpack to treat
 * the package as ONE module regardless of import vs require, so provider and
 * consumers share the same context. See `tanstackSingletonAlias` below.
 */
function resolveEsmEntry(pkg: string): string {
  const pkgJsonPath = require.resolve(`${pkg}/package.json`);
  const pkgRoot = dirname(pkgJsonPath);
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  const esmRelative = pkgJson?.exports?.['.']?.import?.default;
  if (typeof esmRelative !== 'string') {
    throw new Error(`Cannot resolve ESM entry for ${pkg}`);
  }
  return resolve(pkgRoot, esmRelative);
}

/**
 * Force @tanstack/react-query + @tanstack/query-core to a single ESM build.
 *
 * Applied UNCONDITIONALLY (both standalone and microfrontend mode): the
 * dual-build context split is a webpack module-resolution issue inside the
 * host bundle, unrelated to Module Federation sharing. query-core is included
 * so the `QueryClient` class (used by jotai-tanstack-query's queryClientAtom
 * and by QueryClientProvider's `client.mount()`) is also a single instance.
 */
const tanstackSingletonAlias: Record<string, string> = {
  '@tanstack/react-query$': resolveEsmEntry('@tanstack/react-query'),
  '@tanstack/query-core$': resolveEsmEntry('@tanstack/query-core'),
};

// Extract @brainforgeau package versions from package.json
function getBrainforgePackageVersions(): Record<string, string> {
  try {
    const packageJson = JSON.parse(
      readFileSync(resolve(__dirname, 'package.json'), 'utf-8'),
    );
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
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
  environment: process.env.NODE_ENV || 'development',
};

console.log('Helpdesk Modern Config, isStandalone:', isStandalone);
console.log('Helpdesk Modern Config, config:', config);

export default defineConfig({
  runtime: {
    router: process.env.BASE_PATH
      ? {
          basename: process.env.BASE_PATH,
        }
      : true,
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
    alias: {
      // Force @tanstack/react-query + query-core to a single ESM build so the
      // QueryClientContext created by <QueryClientProvider> is the SAME context
      // read by useQueryClient() inside CJS-compiled deps (@brainforgeau/components
      // page-template hooks). Without this, app code resolves the ESM build and
      // the components package resolves the CJS build — two distinct contexts —
      // causing an app-wide "No QueryClient set" crash on permission-gated routes.
      // Applied unconditionally (the split is unrelated to Module Federation).
      ...tanstackSingletonAlias,
      // Force single Jotai instance in standalone mode via aliases
      ...(isStandalone
        ? {
            jotai: require.resolve('jotai'),
            'jotai/react': require.resolve('jotai/react'),
            'jotai/vanilla': require.resolve('jotai/vanilla'),
            'jotai/utils': require.resolve('jotai/utils'),
            'jotai/react/utils': require.resolve('jotai/react/utils'),
          }
        : {}),
    },
  },
  source: {
    // Expose environment variables to client-side code as config object
    // Namespaced to avoid conflicts when multiple microfrontends are loaded
    globalVars: {
      __HELPDESK_CONFIG__: JSON.stringify(config),
      __HELPDESK_STANDALONE__: isStandalone,
      __IDENTITY_BASE_URL__: process.env.IDENTITY_BASE_URL || '',
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
    moduleFederationPlugin(),
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
          chunkIds: 'deterministic',
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
