/**
 * Module Federation RUNTIME plugin for the helpdesk-mf HOST.
 *
 * WHY THIS EXISTS
 * ---------------
 * helpdesk-mf consumes exactly ONE Module Federation remote:
 * `@brainforgeau/navbar` (a webpack `var`-library script remote served as
 * `remoteEntry.js`). It carries the shared top-navigation chrome, consumed
 * via `lazyWithRetry(() => import('@brainforgeau/navbar/Navbar'), ...)`
 * inside an `<ErrorBoundary>` in `src/routes/layout.tsx`.
 *
 * The failure mode this plugin (plus `shareStrategy: 'loaded-first'` in
 * module-federation.config.ts) closes matters once helpdesk-mf is deployed
 * behind ingress: if navbar's `remoteEntry.js` returns HTML / 404 / hangs,
 * the MF runtime can otherwise blank the whole host at BOOT before anything
 * renders.
 *
 * Two changes work together:
 *
 * 1. `shareStrategy: 'loaded-first'` (module-federation.config.ts) removes
 *    the BOOT-TIME remote probe. With the enhanced default
 *    `'version-first'` (see the installed
 *    `@module-federation/enhanced/dist/src/lib/container/runtime/utils.js` —
 *    `shareStrategy: options.shareStrategy || 'version-first'`), the
 *    share-scope init that runs at boot (`__webpack_require__.I` →
 *    runtime-core `initializeSharing`, strategy `'version-first'`) eagerly
 *    initialises EVERY registered remote to collect shared versions — for
 *    navbar that means injecting its `remoteEntry.js` at boot. A dead
 *    navbar entry rejects the whole share-scope init, which is the blank
 *    host. With `'loaded-first'` the eager loop is skipped, so navbar's
 *    entry is only loaded when its exposes are actually imported (the
 *    `lazyWithRetry(() => import('@brainforgeau/navbar/Navbar'), ...)` in
 *    `src/routes/layout.tsx`, i.e. on render, off the boot path). Per-share
 *    singleton semantics are untouched: the modern-js MF plugin already
 *    forces per-share `strategy: 'loaded-first'` on every shared config,
 *    and the host's eager singletons (react / react-dom / react-dom/ /
 *    @brainforgeau/security / @tanstack/react-query / @tanstack/query-core —
 *    the shared entries with `eager: true`; navbar consumes nothing else at
 *    boot) are still installed eagerly, so navbar consumes the
 *    already-populated shared scope when it loads later.
 *
 * 2. This runtime plugin makes a navbar load failure OBSERVABLE.
 *    `errorLoadRemote` fires whenever the runtime fails to load navbar, at
 *    whichever lifecycle stage `@module-federation/runtime-core` reports
 *    for that failure (`beforeRequest`, `beforeLoadShare`, `afterResolve`,
 *    or `onLoad` — see `MfRemoteLoadLifecycle` below). Which stage actually
 *    fires for a given failure mode is a runtime-core internal this file
 *    does not assert; rather than hardcode a guess, it passes the ACTUAL
 *    reported value straight through (falling back to `'unknown'` only if
 *    the runtime omits it). It logs (rate-limited) and dispatches a
 *    `bf:mf-remote-error` CustomEvent on window, then lets the error
 *    propagate — which is exactly what the `<ErrorBoundary>` wrapping
 *    `<TopNavbar>` in `src/routes/layout.tsx` needs to render its fallback
 *    instead of a silent blank navbar. So a bad navbar deploy shows up in
 *    the console / telemetry / any listener rather than as a mystery blank
 *    page.
 *
 * WHY SELF-CONTAINED (no `@brainforgeau/observability` import)
 * ------------------------------------------------------------
 * `createMfResiliencePlugin` (observability's `mfResilience.ts`) is the
 * fleet implementation of this same `errorLoadRemote` contract, and this
 * file mirrors its behaviour — SAME event name (`bf:mf-remote-error`), SAME
 * detail shape as observability's canonical `MfRemoteErrorDetail`
 * (`{ remote, lifecycle, error, url? }`) — so any host UX written against
 * the fleet contract (e.g. `MfRemoteErrorToasts`)
 * keeps working. It is mirrored, NOT imported: runtime-plugin files
 * evaluate inside the MF bootstrap module BEFORE the eager shared modules
 * install, and `@brainforgeau/observability`'s package index re-exports
 * `ObservabilityProvider`, which imports React. That import resolves
 * through the SHARED react consume and crashes the whole host at boot
 * ("factory is undefined … webpack/sharing/consume/default/react/react").
 * Until observability ships a React-free subpath export for the resilience
 * plugin, this file must stay dependency-free.
 *
 * WHAT THIS PLUGIN DELIBERATELY OMITS (vs. the shell's/hr-mf's plugin)
 * ----------------------------------------------------------------------
 * The shell (`app`) and hr-mf plugins also carry a `beforeInitContainer`
 * hook and a `fetch` loader-hook timeout, for their manifest-based
 * host-of-hosts remotes (onboard_mf, analytics_mf, etc.). Both are
 * inapplicable to helpdesk-mf's single SCRIPT remote, so they are omitted
 * rather than cargo-culted: navbar is a LEAF webpack script remote — it
 * does not itself consume further MF remotes as a nested host, and it has
 * no `mf-manifest.json` for the `fetch` loader hook to bound (its entry is
 * loaded by <script> injection, which the runtime's `fetch` loader hook
 * never sees). Keeping either hook here would be dead code with a false
 * impression of hang/nested-container protection.
 *
 * WIRING CONTRACT
 * ---------------
 * Registered via `runtimePlugins: ['./src/mf-runtime-plugin.ts']` in
 * module-federation.config.ts. The modern-js MF plugin bundles this file
 * into the host bootstrap and invokes the DEFAULT-EXPORTED FACTORY on its
 * own runtime instance; runtime-core's `registerPlugins` applies the
 * returned object to every hook system.
 */

/**
 * Map of the import-specifier ALIAS a remote is registered under (the KEY
 * in `remotes` in module-federation.config.ts) to that remote's own
 * registered container name (`remoteInfo.name` — what telemetry consumers
 * actually key on). For a scoped-package alias like `@brainforgeau/navbar`,
 * `args.id` on an import-specifier failure is the full import specifier as
 * written in source — `@brainforgeau/navbar/Navbar` — NOT
 * `<remote-name>/<expose>`. Naively splitting that on `/` yields the npm
 * SCOPE, `@brainforgeau`, not the remote name `navbar`. Matching the full
 * alias string instead (falling back to `remoteInfo.name` first, when the
 * runtime does supply it) fixes that misclassification.
 */
const REMOTE_NAME_BY_ALIAS: Record<string, string> = {
  '@brainforgeau/navbar': 'navbar',
};

function resolveRemoteName(rawId: string, remoteInfoName?: string): string {
  if (remoteInfoName) return remoteInfoName;
  if (rawId.startsWith('http://') || rawId.startsWith('https://')) {
    return rawId;
  }
  const alias = Object.keys(REMOTE_NAME_BY_ALIAS).find(
    candidate => rawId === candidate || rawId.startsWith(`${candidate}/`),
  );
  // Unexpected id shape (not a known alias, not a URL) — surface the raw
  // id rather than a truncated, misleading `split('/')[0]` guess.
  return alias ? REMOTE_NAME_BY_ALIAS[alias] : rawId;
}

/**
 * CustomEvent name dispatched on window when a remote fails to load. Same
 * name as `MF_REMOTE_ERROR_EVENT` in @brainforgeau/observability's
 * mfResilience module so host UX (toasts, banners) written against the
 * fleet contract keeps working.
 */
const MF_REMOTE_ERROR_EVENT = 'bf:mf-remote-error';

/** Minimum ms between error logs for the same remote (30 s). */
const ERROR_LOG_THROTTLE_MS = 30_000;

const lastLoggedAt = new Map<string, number>();

/**
 * The full set of lifecycle stages `@module-federation/runtime-core` can
 * pass to `errorLoadRemote` (verified against the installed
 * `@module-federation/runtime-core` package's `remote/index.d.ts`). Typed
 * as its own union — rather than a bare `string` — so the fallback branch
 * below can't silently mislabel an unrecognised value as a specific, wrong
 * stage.
 */
type MfRemoteLoadLifecycle =
  | 'beforeRequest'
  | 'beforeLoadShare'
  | 'afterResolve'
  | 'onLoad';

interface ErrorLoadRemoteArgs {
  id: string;
  error: unknown;
  options?: { remoteInfo?: { name?: string; entry?: string } };
  from?: string;
  lifecycle?: MfRemoteLoadLifecycle;
  origin?: unknown;
}

export default function helpdeskMfResiliencePlugin() {
  return {
    name: 'bf-helpdesk-mf-resilience',

    /**
     * `errorLoadRemote` — called by @module-federation/runtime when navbar
     * fails to load. The lifecycle stage reported (`beforeRequest`,
     * `beforeLoadShare`, `afterResolve`, or `onLoad`) depends on
     * runtime-core internals this file does not assert — see the WHY THIS
     * EXISTS docblock section 2 above; the actual value is passed straight
     * through rather than hardcoded.
     *
     * Telemetry + event only — the error is ALWAYS re-propagated (return
     * undefined). A synthetic module return would be strictly worse: MF
     * would treat the load as SUCCEEDED and
     * `lazyWithRetry` would then fail with a cryptic "does not provide an
     * export named 'default'" instead of the real cause, and the
     * `<ErrorBoundary>` around `<TopNavbar>` (src/routes/layout.tsx) would
     * never get to render its fallback. Nothing reaches boot either way
     * because `shareStrategy: 'loaded-first'` keeps navbar's entry off the
     * boot path.
     */
    errorLoadRemote(args: ErrorLoadRemoteArgs) {
      const rawId = args.id ?? '';
      const remote = resolveRemoteName(rawId, args.options?.remoteInfo?.name);
      const lifecycle = args.lifecycle ?? 'unknown';
      const errorMessage =
        args.error instanceof Error
          ? args.error.message
          : String(args.error ?? 'unknown error');
      const isUrlId =
        rawId.startsWith('http://') || rawId.startsWith('https://');
      const url =
        args.options?.remoteInfo?.entry ?? (isUrlId ? rawId : undefined);

      const last = lastLoggedAt.get(remote) ?? 0;
      if (Date.now() - last >= ERROR_LOG_THROTTLE_MS) {
        lastLoggedAt.set(remote, Date.now());
        console.error(
          `[helpdesk-mf-resilience] Remote failed to load: ${remote}`,
          {
            remote,
            lifecycle,
            url: url ?? '(unknown)',
            errorMessage,
          },
        );
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(MF_REMOTE_ERROR_EVENT, {
            detail: {
              remote,
              lifecycle,
              error: errorMessage,
              url,
            },
            bubbles: false,
          }),
        );
      }

      // Always propagate — the <ErrorBoundary> around <TopNavbar> is the
      // fallback surface (see the docblock for why a synthetic module
      // return is worse here).
      return undefined;
    },
  };
}
