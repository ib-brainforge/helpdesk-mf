/**
 * The page key help articles are tagged with, for a route id of this app.
 *
 * Route ids are the file-based route paths ("__sidebar/knowledge-base/(slug)/page");
 * a page key is `product.page` in the shape the backend accepts (lower case,
 * dot-separated, letters, digits, `-` and `_`): "helpdesk.knowledge-base.slug".
 * Pathless groups (`__sidebar`) and the trailing `page` / `layout` are not part
 * of the key, so moving a page in or out of a group keeps its help.
 */
export const PAGE_KEY_PRODUCT = 'helpdesk';

export const pageKeyForRouteId = (routeId: string): string => {
  const segments = routeId
    .split('/')
    .filter(s => s && !s.startsWith('__'))
    .map(s => s.replace(/^\((.*)\)$/, '$1'))
    .map(s =>
      s
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, ''),
    )
    .filter(Boolean);
  if (['page', 'layout'].includes(segments.at(-1) ?? '')) segments.pop();
  return [PAGE_KEY_PRODUCT, ...segments].join('.');
};
