import { createModuleFederationConfig } from '@module-federation/modern-js';

const mfPackagesUrl = process.env.MF_PACKAGES_URL || 'http://localhost';
const mfNavbarUrl =
  process.env.NODE_ENV === 'production'
    ? '/mfs/packages/navbar'
    : process.env.MF_NAVBAR_URL || `${mfPackagesUrl}:3001`;

export default createModuleFederationConfig({
  name: 'helpdesk_mf',
  dts: false,
  // pilot(shell-host): helpdesk-mf is exposed in its ENTIRETY as an
  // "app-level" Module Federation remote for the app-shell pilot.
  // `./export-app` wraps the whole file-routed application (every
  // src/routes/** page, helpdesk-mf's own TopNavbar/SideNav chrome, layout,
  // providers) via bridge-react's createBridgeComponent — see
  // src/export-app.tsx. The app shell consumes it as
  // `helpdesk_mf/export-app` and mounts it at /helpdesk.
  exposes: {
    './export-app': './src/export-app.tsx',
  },
  // pilot(shell-host): required so bridge-react-webpack-plugin's
  // react-router-dom alias engages for THIS build. That alias re-creates
  // the exposed app's RouterProvider with the host-supplied `basename` at
  // mount time, overriding this build's own BASE_PATH-derived basename.
  // (The plugin auto-detects via `@module-federation/bridge-react` being a
  // direct dependency — see package.json — but declaring it explicitly here
  // avoids relying on that auto-detection and its console warning.)
  bridge: {
    enableBridgeRouter: true,
  },
  remotes: {
    '@brainforgeau/navbar': `navbar@${mfNavbarUrl}/remoteEntry.js`,
  },
  // remote-resilience: `@module-federation/enhanced` defaults the
  // instance-level shareStrategy to 'version-first' when unset (see the
  // installed
  // `@module-federation/enhanced/dist/src/lib/container/runtime/utils.js` —
  // `shareStrategy: options.shareStrategy || 'version-first'`). Under
  // 'version-first', the share-scope init that runs at BOOT
  // (`__webpack_require__.I` → runtime-core's `initializeSharing`) eagerly
  // initializes EVERY registered remote — here, just navbar — to collect
  // shared versions, which means fetching/injecting navbar's remoteEntry.js
  // before React ever mounts. If navbar's remoteEntry.js is unreachable
  // (bad deploy behind ingress, returns HTML, 404s, or hangs), that
  // boot-time init rejects and blanks the WHOLE helpdesk-mf app, not just the
  // nav chrome. 'loaded-first' skips that eager boot-time loop entirely —
  // navbar's remoteEntry.js is then only fetched when its expose is
  // actually imported, i.e. at the `lazyWithRetry(() =>
  // import('@brainforgeau/navbar/Navbar'), ...)` call in
  // src/routes/layout.tsx, on the render path behind an `<ErrorBoundary>`,
  // not the boot path. Paired with `runtimePlugins` below, which makes a
  // navbar load failure observable instead of silently propagating.
  shareStrategy: 'loaded-first',
  // remote-resilience: registers src/mf-runtime-plugin.ts so a navbar load
  // failure (post `shareStrategy: 'loaded-first'` above) is logged and
  // surfaced as a `bf:mf-remote-error` window event rather than an
  // unhandled rejection — see that file's docblock for the full rationale.
  runtimePlugins: ['./src/mf-runtime-plugin.ts'],
  shared: {
    react: {
      singleton: true,
      requiredVersion: '^19.2.5',
      strictVersion: true,
      eager: true,
    },
    'react-dom': {
      singleton: true,
      requiredVersion: '^19.2.5',
      strictVersion: true,
      eager: true,
    },
    // pilot(shell-host): react-dom/client (used by react-dom's createRoot
    // API) is a separate MF share-scope entry from 'react-dom' unless the
    // trailing-slash prefix form is also shared. Without this, the app shell
    // and helpdesk-mf's export-app can each get a different react-dom/client,
    // risking two React roots. Matches the official Modern.js MF docs
    // recommendation for application-level modules.
    'react-dom/': {
      singleton: true,
      requiredVersion: '^19.2.5',
      strictVersion: true,
      eager: true,
    },
    // One copy of the component library for the shell and every remote. Both
    // the root key and the trailing-slash prefix key are shared so the barrel
    // and the subpath imports (@brainforgeau/components/alert, /icons, ...)
    // resolve to the same shared instance. Not eager: the shell loads it from
    // its own async chunk.
    '@brainforgeau/components': { singleton: true, requiredVersion: false },
    '@brainforgeau/components/': { singleton: true, requiredVersion: false },
    // Security MUST be shared as singleton for auth context to work across
    // module federation. It is NOT eager here: the shell provides the eager
    // copy, and an eager share in a remote forces security and its dependency
    // tree (identity client, oidc, axios, a second react-dom) into the remote's
    // entry file. Standalone boot is safe because Modern.js entries are
    // async-bootstrapped (shared scope initialised before use). Mirrors
    // tracking-mf #1576.
    '@brainforgeau/security': {
      singleton: true,
      requiredVersion: false,
    },
    // Generated identity client: one copy for the shell and every remote; the shell provides it.
    '@brainforgeau/identity-management-client': {
      singleton: true,
      requiredVersion: false,
    },
    jotai: {
      singleton: true,
      requiredVersion: false,
    },
    '@heroui/react': {
      singleton: true,
      requiredVersion: false,
    },
    '@heroicons/react': {
      singleton: true,
      requiredVersion: false,
    },
    'framer-motion': {
      singleton: true,
      requiredVersion: false,
    },
    // pilot(shell-host): react-query + query-core MUST be shared as EAGER
    // singletons so that @brainforgeau/components' form primitives
    // (useQueryClient/useMutation) and helpdesk-mf's own useQuery hooks read
    // the SAME QueryClientProvider, and so the QueryClient (query-core) and
    // QueryObserver stay on ONE instance across the shell↔remote boundary.
    // `eager` makes the host populate the shared scope first
    // (load-order-independent). Without both, an embedded helpdesk-mf can
    // double-instance react-query — QueryObserver.createResult then throws
    // "t.isFetched is not a function". Matches identity-mf's working config.
    '@tanstack/react-query': {
      singleton: true,
      requiredVersion: false,
      eager: true,
    },
    '@tanstack/query-core': {
      singleton: true,
      requiredVersion: false,
      eager: true,
    },
  },
});
