import { describe, expect, it, vi } from 'vitest';
import { lookupTrackedAssetIds } from './trackedAssetLookup';

const guid = (n: number) =>
  `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

const fakeClient = (trackedCodes: string[]) => {
  const v1TrackablesOptionsGet = vi.fn(
    async (
      _search?: string,
      _page?: number,
      _pageSize?: number,
      _ids?: string[],
      _active?: boolean,
      _mdvrOnly?: boolean,
      subjectIds: string[] = [],
    ) => ({
      data: {
        items: subjectIds
          .filter(id => trackedCodes.includes(id))
          .map(id => ({ id: `t-${id}`, label: 'x', code: id.toUpperCase() })),
      },
    }),
  );
  return {
    client: { v1TrackablesOptionsGet } as unknown as Parameters<
      typeof lookupTrackedAssetIds
    >[0],
    calls: v1TrackablesOptionsGet.mock.calls,
  };
};

describe('lookupTrackedAssetIds', () => {
  it('asks in chunks of at most 100 subject ids', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => guid(i));
    const { client, calls } = fakeClient([]);
    await lookupTrackedAssetIds(client, ids);
    expect(calls.map(c => c[6]?.length)).toEqual([100, 100, 50]);
    expect(calls.every(c => (c[2] ?? 0) >= 100)).toBe(true);
    expect(calls.flatMap(c => c[6] ?? [])).toEqual(ids);
  });

  it('makes a single call for fewer than 100 ids', async () => {
    const { client, calls } = fakeClient([]);
    await lookupTrackedAssetIds(client, [guid(1), guid(2)]);
    expect(calls).toHaveLength(1);
  });

  it('returns the returned codes lowercased', async () => {
    const { client } = fakeClient([guid(7)]);
    const found = await lookupTrackedAssetIds(client, [guid(7), guid(8)]);
    expect(found).toEqual(new Set([guid(7)]));
  });
});
