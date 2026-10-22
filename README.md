# helpdesk-mf

Helpdesk/ticketing microfrontend. Built with Modern.js + Module Federation +
HeroUI. Can run two ways locally — pick whichever matches what you're working
on.

## Local development

### Prerequisites

```bash
pnpm install
```

Worktrees don't share `node_modules` with the main checkout — always run
`pnpm install` fresh after `git worktree add`.

### Mode A — Standalone (own app, port 8087)

Use this when you're working on helpdesk-mf in isolation and don't need the
shell chrome (navbar, app-switcher, etc.).

```bash
pnpm dev
```

Opens on **http://localhost:8087**. `.env` (committed, this is the local-dev
source of truth — see the file's own header comment) already has everything
needed:

- `STANDALONE=true` — bakes `__HELPDESK_STANDALONE__` at build time, which
  `src/providers/AuthProvider.tsx` uses to select `FlexibleAuthProvider`'s
  `mode="shell"` (full OIDC init) instead of `mode="microfrontend"`
  (auth-bus-only, expects a host shell). "shell" here means "own the OIDC
  provider", not literally the app shell — same terminology tracking-mf uses.
- `OIDC_AUTHORITY` / `OIDC_CLIENT_ID` point at the **cloud** Keycloak
  (`auth.brainforge.com.au`, realm `test`, client `platform`). There is no
  local Keycloak — you log in with a real test-realm account.
- `OIDC_REDIRECT_URI=http://localhost:8087` is the active default (fleet
  convention: `.env` defaults to standalone; the shell-embedded/deployed
  value sits directly above it, commented out). For helpdesk-mf specifically
  this value doesn't actually matter either way:
  `@brainforgeau/security`'s `FlexibleAuthProvider` rebinds it to the
  browser's actual origin at runtime (`rebindUriToCurrentOrigin`, keeps the
  configured path, swaps in `window.location.origin`), so on :8087 the
  browser is sent to Keycloak with `redirect_uri=http://localhost:8087/`
  regardless of what's committed here — verified against the installed
  `@brainforgeau/security` build (`rebindUriToCurrentOrigin` is present in
  `node_modules/@brainforgeau/security/dist/auth/FlexibleAuthProvider.js`),
  same package version and mechanism already proven live end-to-end in
  asset-mf. In shell-embedded mode this key isn't read at all — the shell
  owns OIDC and helpdesk-mf never initializes its own provider (see Mode B
  below). If you ever do need to point OIDC at something other than the
  rebound origin (e.g. a non-standard callback path), override it the same
  way as any other key below — untracked `.env.local` values win over `.env`
  (Modern.js/rsbuild loads `.env` then `.env.local` and the later file takes
  precedence).
- `TRACING_IGNORE_URLS_PATTERN=auth\.brainforge\.com\.au` — **load-bearing
  for standalone login.** Without it, the OTel fetch instrumentation
  (observability tracing) stamps a `traceparent` header on every outgoing
  fetch, including the OIDC discovery-document fetch
  (`.../.well-known/openid-configuration`). `auth.brainforge.com.au`'s CORS
  policy doesn't allowlist that header for arbitrary localhost origins, so
  the preflight fails, the discovery fetch never completes, and
  `oidc-client-ts` can never build the authorize URL — you get an endless
  "attempting silent SSO" / "Transient OIDC signal, kicking off fresh
  sign-in redirect" loop in the console and the browser never actually
  navigates to Keycloak. If you ever see that exact loop, check this var
  first. See the comment above it in `.env` for the full trace.
- `HELPDESK_API_BASE_URL` (and the other `*_API_BASE_URL` keys) default to
  the cloud backends (`https://app.brainforge.com.au/backend/...`). To point
  at a locally-running helpdesk-backend instead, override just that one key,
  e.g. in an untracked `.env.local`:
  ```bash
  HELPDESK_API_BASE_URL=http://localhost:8080
  ```
  Every backend URL is its own named key (`<SERVICE>_API_BASE_URL`) — nothing
  is derived from anything else, so you can mix cloud and local per-service.

Auth notes:
- Login goes through the real cloud Keycloak. You need a valid `test` realm
  account.
- `?r=<realm>` / `?r=clear` URL params work the same as in the shell (realm
  override, persisted to localStorage, `?r=clear` nukes it).
- If login redirects but never lands back on the app, check the browser
  console for the CORS/traceparent symptom above before assuming it's a
  Keycloak client config issue — that's what it looks like the app boots,
  auth loops, never actually opening a Keycloak page.

### Mode B — Shell-embedded (app shell + this MF)

Use this when you need the real chrome (navbar, app-switcher, cross-app
context) or you're testing something that only manifests when embedded
(e.g. the `window.__BF_SHELL_HOST__` code paths in
`src/providers/index.tsx` / `src/providers/AuthProvider.tsx`).

Terminal 1 — the shell (`app` repo), default port 8080:
```bash
cd ~/Projects/bf-github/app   # or your app worktree
pnpm dev
```

Terminal 2 — this MF, port 8087 (same command as standalone — the exact
same build serves both entry points; `export-app.tsx` is what the shell
consumes):
```bash
pnpm dev
```

Open **http://localhost:8080/helpdesk**. The shell mounts helpdesk-mf as an
app-level Module Federation remote (`helpdesk_mf/export-app`).

Remote resolution:
- The shell's dev default for helpdesk-mf is
  `http://localhost:8087/helpdesk/mf-manifest.json` (see
  `app/module-federation.config.ts`). If your helpdesk-mf dev server is on a
  different port (e.g. 8087 is already taken by another worktree), override
  on the shell side:
  ```bash
  MF_HELPDESK_URL=http://localhost:8097/helpdesk/mf-manifest.json pnpm dev   # in the app repo
  ```
  and run this MF's dev server accordingly (`modern dev` picks the next free
  port automatically if 8087 is busy — check the terminal output for which
  port it actually bound, and set `MF_DEV_PUBLIC_ORIGIN` to match, see
  below).
- `modern.config.ts`'s `dev.port` is hardcoded to `8087` (not env-driven).
  If it's busy, `modern dev` auto-falls-back to the next free port (8088,
  8089, ...) — but `dev.assetPrefix` (where the manifest tells consumers to
  fetch chunks from) is still hardcoded to `http://localhost:8087` unless you
  set `MF_DEV_PUBLIC_ORIGIN` to match the port it actually bound. Mismatch
  here is why remote chunks 404 with MF `RUNTIME-008` when two helpdesk-mf
  dev servers can't both hold 8087.
- Auth in this mode: the shell owns OIDC. helpdesk-mf's `AuthProvider`
  detects the shell's `window.__BF_SHELL_HOST__` marker (`detectEmbedded`
  prop) and forces `FlexibleAuthProvider` into `mode="microfrontend"`
  regardless of the `STANDALONE` build flag — it does **not** initialize its
  own OIDC provider, it just reads the shell's auth-bus state. This is why
  the exact same build artifact works both standalone and embedded without a
  rebuild.

Shared-singleton caveat:
- `@brainforgeau/security` is shared as an **eager singleton** across the
  shell and every embedded remote (see `module-federation.config.ts`'s
  `shared` block). Module Federation singleton resolution keeps whichever
  version is "winning" for the whole page — **helpdesk-mf's installed
  `@brainforgeau/security` must not be newer than the shell's**, or the
  shell can end up running a security package version it never tested
  against. Check both `package.json`s if auth behaves differently embedded
  vs standalone:
  ```bash
  grep '"@brainforgeau/security"' ~/Projects/bf-github/app/package.json \
    ~/Projects/bf-github/helpdesk-mf/package.json
  ```
- Same applies to `react`, `react-dom`, `@tanstack/react-query`, `jotai`,
  `@heroui/react`, `@heroicons/react`, `framer-motion` — all shared
  singletons per `module-federation.config.ts`.

Remote resilience: helpdesk-mf also consumes the `navbar` remote
(`@brainforgeau/navbar`, dev port 3001). A missing/unreachable navbar dev
server no longer blanks out helpdesk-mf at boot — `shareStrategy:
'loaded-first'` plus `src/mf-runtime-plugin.ts` mean navbar's
`remoteEntry.js` is only fetched when it's actually imported (the
`lazyWithRetry(() => import('@brainforgeau/navbar/Navbar'), ...)` call in
`src/routes/layout.tsx`), on the render path behind an `<ErrorBoundary>`, not
the boot path. A navbar load failure degrades to that `<ErrorBoundary>`'s
fallback around `<TopNavbar>` instead of killing the whole app, and is
surfaced as a `bf:mf-remote-error` window event.

### Helpdesk API client

The helpdesk TypeScript client is vendored under `src/api/helpdesk-client` and
generated from helpdesk-backend's committed `openapi/swagger.json`. Never edit
those files by hand; after a backend API change regenerate with:

```bash
tool/openapi/generate-clients.sh   # needs openapi-generator-cli 7.16.0 and a helpdesk-backend clone
```

Set `BACKENDS_ROOT` if the backend clones are not under `~/Projects/bf-github/ib`.

### Common gates before pushing

```bash
pnpm install --frozen-lockfile
pnpm run lint        # biome check
pnpm exec tsc --noEmit
pnpm test            # vitest, pure-logic unit tests
pnpm build
```

Playwright e2e (`pnpm run test:e2e`) is a separate suite and not a required
local gate before pushing.
