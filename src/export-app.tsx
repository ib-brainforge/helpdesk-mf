/**
 * Application-level Module Federation "producer" entry point.
 *
 * pilot(shell-host): exposes helpdesk-mf's ENTIRE file-routed application
 * (every src/routes/** page, its own TopNavbar/SideNav chrome, root layout,
 * providers) as a single federated remote — `helpdesk_mf/export-app` (see
 * module-federation.config.ts `exposes`) — following Modern.js's documented
 * "Application-Level Modules" producer pattern.
 *
 * `@modern-js/runtime/registry/main` is a build-time VIRTUAL module that
 * app-tools/rspack generates and resolves to helpdesk-mf's file-based route
 * registry — the exact import app-tools injects into helpdesk-mf's own
 * default (non-federated) CSR entry point (see
 * node_modules/@modern-js/runtime/dist/esm/cli/template.js,
 * `entryName` = 'main' for helpdesk-mf's single entry). Importing it here
 * wires up the router exactly like the normal entry does, so `createRoot()`
 * below returns a component that renders helpdesk-mf's full route tree —
 * INCLUDING its own chrome. This pilot intentionally does NOT gate
 * helpdesk-mf's SideNav in this file; see src/routes/layout.tsx's
 * `__BF_SHELL_HOST__` branch, which now skips rendering helpdesk-mf's own
 * TopNavbar so the shell's single navbar instance can persist across shell
 * <-> /helpdesk transitions (see app's src/routes/layout.tsx).
 *
 * REVIEW: TypeScript has no ambient declaration for the virtual module path
 * (it only exists as an rspack-resolved alias, not a real package export),
 * so one is declared in src/types/modern-runtime-registry.d.ts.
 *
 * React 19: `createBridgeComponent` is imported from the version-specific
 * `@module-federation/modern-js/react-v19` entry (re-exporting
 * `@module-federation/bridge-react/v19`), NOT the unversioned `/react`
 * entry — bridge-react's default (legacy) root creator throws for React 19
 * ("React 19 detected in legacy mode... use the version-specific import"),
 * so v19 is required on the PRODUCER side. The host's `createRemoteAppComponent`
 * (consumer side) has no such version split — see app/src/routes/helpdesk/$.tsx.
 *
 * Auth when embedded: see providers/AuthProvider.tsx (no FlexibleAuthProvider
 * mounted when `window.__BF_SHELL_HOST__ === true` — helpdesk's auth/permission
 * hooks fall back to the host's window auth bus instead) and
 * providers/index.tsx (skips `configureContextTokenRefresh` when embedded so
 * the host stays the sole owner of the shared authorizedAxios config).
 *
 * P2 update: while embedded, the SHELL's ActiveAppTokenManager is the
 * primary mechanism — it re-mints the SHARED context token for whichever
 * app is active (its `app` claim is 'helpdesk' on /helpdesk routes), so
 * helpdesk-backend permission checks see the right app id.
 * `@/state/authorizedAxios` adds a per-request safety net on top: it decodes
 * the shared token's app claim and, only when it is NOT 'helpdesk' (brief
 * re-scope window, future cross-app calls), delegates to a
 * 'helpdesk'-scoped `createCrossAppAxios` instance — degrading back to the
 * shared token if issuance is unreachable (see that file's
 * `pilot(shell-host)` decision tree). helpdesk-mf's per-feature SignalR
 * hooks (useSignalR and friends) are left as-is for this pilot — they read
 * the shared token via `getContextToken()`, correct whenever the active app
 * is 'helpdesk' (i.e. whenever those pages are mounted), but with no
 * per-request safety net during the re-scope window.
 */
import '@modern-js/runtime/registry/main';
import { render } from '@modern-js/runtime/browser';
import { createRoot } from '@modern-js/runtime/react';
import { createBridgeComponent } from '@module-federation/modern-js/react-v19';

export default createBridgeComponent({
  rootComponent: createRoot(),
  render: (App, dom) => render(App, dom),
});
