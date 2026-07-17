import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { appTools, defineConfig } from '@modern-js/app-tools';
import { bffPlugin } from '@modern-js/plugin-bff';
import { moduleFederationPlugin } from '@module-federation/modern-js';
import type {
  OptimizationSplitChunksCacheGroup,
  OptimizationSplitChunksOptions,
} from '@rspack/core';
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
    // Telemetry gateway base URL (v2). Logs/traces/sessions are routed through
    // the telemetry-gateway service; the SDK appends /v1/{sessions,logs,traces}.
    // Defaults at runtime to the helpdesk backend API origin + /backend/telemetry;
    // overridable per-environment via TELEMETRY_GATEWAY_URL.
    telemetryGatewayUrl: process.env.TELEMETRY_GATEWAY_URL || '',
    tracing: {
      enabled: process.env.TRACING_ENABLED === 'true',
      // Domains to exclude from trace header propagation (to avoid CORS issues)
      ignoreUrlsPattern: process.env.TRACING_IGNORE_URLS_PATTERN || '',
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      webVitals: true,
      // Metrics are logged to Loki as structured data via the gateway
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
    // pilot(shell-host): dev-only. When helpdesk-mf is loaded as a Module
    // Federation remote inside the app shell (localhost:8080), the shared
    // `@module-federation/runtime` resolves the manifest's `publicPath`
    // relative to the CONSUMING document's origin unless it's absolute. A
    // relative dev assetPrefix (e.g. '/') bakes `publicPath: "/"` into the
    // dev manifest, which the shell then resolves against ITS OWN origin
    // (8080) instead of helpdesk-mf's dev server (8087) — remote-entry
    // fetches 404 with MF RUNTIME-008 ("Failed to load script resources",
    // resourceUrl "/static/js/helpdesk_mf.js"). Advertising the
    // fully-qualified dev origin here fixes that; production is
    // unaffected — see `output.assetPrefix` above, which is untouched.
    assetPrefix: process.env.MF_DEV_PUBLIC_ORIGIN
      ? `${process.env.MF_DEV_PUBLIC_ORIGIN}${process.env.BASE_PATH ? `${process.env.BASE_PATH}/` : '/'}`
      : `http://localhost:8087${process.env.BASE_PATH ? `${process.env.BASE_PATH}/` : '/'}`,
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
      // css-base-split: force helpdesk-mf's single precompiled
      // `@brainforgeau/theme/base.css` (imported once, unconditionally, in
      // src/routes/layout.tsx before './index.css') into its OWN named CSS
      // chunk, named literally `base` — NOT `theme-base` (that name is the
      // SHELL's own cache group; see app/modern.config.ts's `themeBase`
      // comment, "remotes = `base`; shell = `theme-base`" — reusing the
      // shell's name here would make this chunk invisible to the shell's
      // suppression regex). The shell's `useRemoteStylesheets`
      // (`REMOTE_BASE_STYLESHEET_PATTERN`,
      // app/src/utils/useRemoteStylesheets.ts) permanently disables any
      // SAME-ORIGIN link under `<prefix>/static/css/(async/)?base(.<hash>)?
      // .css` — helpdesk is embedded at prefix `/helpdesk`, so this chunk
      // MUST land at `/helpdesk/static/css/(async/)?base.<hash>.css` for
      // that suppression to ever fire; without this cache group, Rspack's
      // default behavior concatenates base.css into the same chunk as
      // index.css's utilities (same failure mode the shell's P2 rollout hit
      // and documented), the shell could never isolate/disable it, and
      // helpdesk's `:root`/preflight would cascade over the shell's chrome
      // on every /helpdesk visit — the exact bug this initiative removes.
      // `enforce: true` bypasses the default minSize/minChunks heuristics
      // so this cache group always produces its own chunk regardless of
      // size. Standalone (no shell), this chunk simply loads as a second,
      // unsuppressed `<link>` next to the utilities chunk — no functional
      // difference from a combined sheet. Matches hr-mf's own
      // modern.config.ts, the reference implementation of this cache group.
      config.optimization = config.optimization || {};
      const splitChunks: OptimizationSplitChunksOptions =
        typeof config.optimization.splitChunks === 'object' &&
        config.optimization.splitChunks !== null
          ? config.optimization.splitChunks
          : {};
      const remoteBaseCacheGroup: OptimizationSplitChunksCacheGroup = {
        name: 'base',
        test: /[\\/]node_modules[\\/]@brainforgeau[\\/]theme[\\/]dist[\\/]base\.css$/,
        chunks: 'all',
        enforce: true,
      };
      splitChunks.cacheGroups = {
        ...splitChunks.cacheGroups,
        remoteBase: remoteBaseCacheGroup,
      };
      config.optimization.splitChunks = splitChunks;

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
          // pilot(shell-host): Do NOT set `runtimeChunk: 'single'`.
          // helpdesk-mf is now ALSO a Module Federation producer — it
          // exposes its whole app (`./export-app`, consumed by the app
          // shell). `runtimeChunk: 'single'` extracts the webpack runtime
          // into a separate chunk, leaving the MF remote entry
          // non-self-bootstrapping: a consumer loads the entry but
          // `window.helpdesk_mf` is never defined because the jsonp
          // handler lives in the missing runtime chunk → MF RUNTIME-008
          // "Failed to load script resources". The remote entry must
          // inline its own runtime, so leave runtimeChunk at the default.
          // Matches hr-mf/asset-mf/onboard-mf/modern.config.ts, which hit
          // and documented this same bug when they became producers.
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
