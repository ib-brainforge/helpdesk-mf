import { describe, expect, it, vi } from 'vitest';
import {
  MAX_SCOPES,
  fetchAssigneePage,
  intersectionRequest,
  keepWhileScopeUnchanged,
  scopeToken,
} from './assigneeLookup';

type Api = Parameters<typeof fetchAssigneePage>[0];

const fakeApi = () => {
  const get = vi.fn(async (..._args: unknown[]) => ({
    data: { items: [], totalCount: 0 },
  }));
  return {
    api: { v1AppsAppIdAssignableUsersOptionsGet: get } as unknown as Api,
    get,
  };
};

// (appId, tenantId, organisationId, divisionId, scopes, search, ids, page, pageSize)
const SCOPES = 4;
const SEARCH = 5;
const IDS = 6;

describe('fetchAssigneePage', () => {
  it('sends a single scope as separate parameters', async () => {
    const { api, get } = fakeApi();
    await fetchAssigneePage(
      api,
      'app-1',
      { tenantId: 't', organisationId: 'o', divisionId: 'd' },
      { pageSize: 25 },
    );
    const a = get.mock.calls[0];
    expect(a.slice(0, 5)).toEqual(['app-1', 't', 'o', 'd', undefined]);
    expect(a[7]).toBe(1);
    expect(a[8]).toBe(25);
  });

  it('never sends ids together with a search', async () => {
    const { api, get } = fakeApi();
    await fetchAssigneePage(
      api,
      'a',
      { tenantId: 't' },
      {
        search: 'ann',
        ids: ['u1', 'u2'],
        pageSize: 100,
      },
    );
    const a = get.mock.calls[0];
    expect(a[IDS]).toEqual(['u1', 'u2']);
    expect(a[SEARCH]).toBeUndefined();
  });

  it('sends the search alone when there are no ids', async () => {
    const { api, get } = fakeApi();
    await fetchAssigneePage(
      api,
      'a',
      { tenantId: 't' },
      {
        search: 'ann',
        ids: [],
        pageSize: 25,
      },
    );
    const a = get.mock.calls[0];
    expect(a[SEARCH]).toBe('ann');
    expect(a[IDS]).toBeUndefined();
  });

  it('passes scope tokens as the repeated scopes parameter', async () => {
    const { api, get } = fakeApi();
    await fetchAssigneePage(
      api,
      'a',
      { scopes: ['t:o:d', 't::'] },
      { pageSize: 25 },
    );
    expect(get.mock.calls[0][SCOPES]).toEqual(['t:o:d', 't::']);
  });
});

describe('scope tokens', () => {
  it('are tenant:organisation:division with empty segments', () => {
    expect(
      scopeToken({ tenantId: 't', organisationId: 'o', divisionId: 'd' }),
    ).toBe('t:o:d');
    expect(scopeToken({ tenantId: 't' })).toBe('t::');
    expect(scopeToken({ organisationId: 'o' }, 'ctx')).toBe('ctx:o:');
    expect(scopeToken({}, null)).toBe('::');
  });

  it('are distinct and sorted', () => {
    const { tokens, tooMany } = intersectionRequest([
      { tenantId: 'b' },
      { tenantId: 'a' },
      { tenantId: 'b' },
    ]);
    expect(tokens).toEqual(['a::', 'b::']);
    expect(tooMany).toBe(false);
  });

  it('flag more than 25 distinct scopes, so no request is made', () => {
    const many = Array.from({ length: MAX_SCOPES + 1 }, (_, i) => ({
      tenantId: 't',
      organisationId: `o${i}`,
    }));
    expect(intersectionRequest(many).tooMany).toBe(true);
    expect(intersectionRequest(many.slice(0, MAX_SCOPES)).tooMany).toBe(false);
  });
});

describe('keepWhileScopeUnchanged', () => {
  const key = (ctx: string, scope: string, term: string) => [
    'assignees',
    'options',
    ctx,
    scope,
    term,
  ];
  const keep = keepWhileScopeUnchanged('ctx', 't:o:');

  it('keeps the previous result while only the search changes', () => {
    expect(keep(['ann'], { queryKey: key('ctx', 't:o:', 'a') })).toEqual([
      'ann',
    ]);
  });

  it('shows nothing from the previous scope', () => {
    expect(keep(['ann'], { queryKey: key('ctx', 't:p:', '') })).toBeUndefined();
  });

  it('shows nothing from the previous context', () => {
    expect(
      keep(['ann'], { queryKey: key('other', 't:o:', '') }),
    ).toBeUndefined();
  });

  it('shows nothing when there is no previous query', () => {
    expect(keep(['ann'], undefined)).toBeUndefined();
  });
});
