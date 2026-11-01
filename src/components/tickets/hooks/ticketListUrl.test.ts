import { describe, expect, it } from 'vitest';
import { filtersFromUrl, writeListToUrl } from './ticketListUrl';

describe('the Raised with our provider preset in the URL', () => {
  it('reads raised=1 as raisedAboveOnly', () => {
    expect(
      filtersFromUrl(new URLSearchParams('raised=1')).raisedAboveOnly,
    ).toBe(true);
    expect(
      filtersFromUrl(new URLSearchParams('')).raisedAboveOnly,
    ).toBeUndefined();
  });

  it('writes it back, and drops it when cleared', () => {
    const write = (raisedAboveOnly?: boolean) =>
      writeListToUrl(new URLSearchParams('raised=1'), {
        tab: 'all',
        filters: { raisedAboveOnly },
        sort: null,
        pagination: { pageIndex: 0, pageSize: 25 },
      }).get('raised');
    expect(write(true)).toBe('1');
    expect(write(undefined)).toBeNull();
  });
});
