import { describe, expect, it } from 'vitest';
import { pageKeyForRouteId } from './pageKey';

// The keys must match the backend's page key shape:
// ^[a-z0-9][a-z0-9_-]*(\.[a-z0-9_-]+)*$ (KbArticle.PageKeyShape).
const PAGE_KEY_SHAPE = /^[a-z0-9][a-z0-9_-]*(\.[a-z0-9_-]+)*$/;

describe('pageKeyForRouteId', () => {
  it.each([
    ['page', 'helpdesk'],
    ['tickets/page', 'helpdesk.tickets'],
    ['tickets/(id)/page', 'helpdesk.tickets.id'],
    ['__sidebar/knowledge-base/page', 'helpdesk.knowledge-base'],
    [
      '__sidebar/knowledge-base/(slug)/edit/page',
      'helpdesk.knowledge-base.slug.edit',
    ],
    [
      '__sidebar/knowledge-base/category/(categorySlug)/page',
      'helpdesk.knowledge-base.category.category-slug',
    ],
    ['provider/tickets/(id)/page', 'helpdesk.provider.tickets.id'],
    ['dashboard/layout', 'helpdesk.dashboard'],
  ])('%s -> %s', (routeId, key) => {
    expect(pageKeyForRouteId(routeId)).toBe(key);
    expect(key).toMatch(PAGE_KEY_SHAPE);
  });
});
