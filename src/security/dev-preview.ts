import type * as Preview from './preview';

/**
 * THE ONE GATE for the development-only "Preview as role" feature.
 *
 * The bundler replaces `process.env.NODE_ENV` with a string literal, so in a
 * production build this condition is `"production" === "development"`, the
 * branch is dead, and the `require` inside it is never followed: nothing under
 * src/security/preview is bundled, and `devPreview` is null.
 *
 * `require` rather than a static import on purpose. A static import would put
 * the module in the production graph and leave it to tree shaking to drop,
 * and this build turns side-effect pruning off (modern.config.ts sets
 * `optimization.sideEffects: false`), so the preview store would still load
 * and read the URL. Only the type is imported statically, and types are
 * erased.
 *
 * Nothing else may import from ./preview. `grep -rn "security/preview\|./preview'" src`
 * should list only this file and the preview module's own files.
 */
export const devPreview: typeof Preview | null =
  process.env.NODE_ENV === 'development'
    ? (require('./preview') as typeof Preview)
    : null;
