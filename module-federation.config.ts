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
    // Components is not shared because it requires webpack SVG transformations
    // The navbar remote will bundle its own copy of components
    // '@brainforgeau/components': {
    //   singleton: true,
    //   requiredVersion: false,
    // },
    // Security MUST be shared as singleton for auth context to work across module federation
    '@brainforgeau/security': {
      singleton: true,
      requiredVersion: false,
      eager: true, // Load eagerly since auth is needed immediately
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
