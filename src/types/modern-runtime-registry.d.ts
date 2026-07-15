/**
 * pilot(shell-host): `@modern-js/runtime/registry/main` is a build-time
 * VIRTUAL module — app-tools/rspack resolves it to helpdesk-mf's generated
 * file-based route registry (see
 * node_modules/@modern-js/runtime/dist/esm/cli/template.js). It is not a
 * real package export, so TypeScript has no declaration for it. Only
 * `src/export-app.tsx` (the Module Federation "app-level" producer entry)
 * imports it directly — every other entry point gets it injected
 * automatically by app-tools' own generated CSR entry.
 */
declare module '@modern-js/runtime/registry/main';
