import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ACCESS_DENIED_COPY, RouteGuard } from './route-permissions';

// The real AccessDenied, imported from its own file: the package index reads
// window and localStorage while loading, which the node test environment lacks.
vi.mock('@brainforgeau/security', async () => ({
  AccessDenied: (
    await import(
      '../../node_modules/@brainforgeau/security/dist/components/AccessDenied.js'
    )
  ).AccessDenied,
  usePermissions: () => ({ hasAnyPermission: () => false, isLoading: false }),
}));

describe('RouteGuard denied path', () => {
  it('shows the access-denied title and the Go Home action', () => {
    const html = renderToStaticMarkup(
      <RouteGuard pathname="/tickets">
        <p>secret page</p>
      </RouteGuard>,
    );
    expect(html).toContain(ACCESS_DENIED_COPY.title.replace("'", '&#x27;'));
    expect(html).toContain('Go Home');
    expect(html).not.toContain('secret page');
  });
});
