import { describe, expect, it } from 'vitest';
import { KB_SORT_KEYS, kbSortKeys, kbSortParam } from './kbListSort';

describe('KB list sorting while searching', () => {
  const sorting = [{ id: 'updatedAt', desc: true }];

  it('sorts on the server keys when there is no search', () => {
    expect(kbSortKeys('')).toBe(KB_SORT_KEYS);
    expect(kbSortParam(sorting, '')).toBe('-modifiedAt');
  });

  it('turns every column off and sends no sort while a term is set', () => {
    expect(kbSortKeys('vpn')).toEqual({});
    expect(kbSortParam(sorting, 'vpn')).toBeUndefined();
  });

  it('treats a blank term as no search', () => {
    expect(kbSortKeys('  ')).toBe(KB_SORT_KEYS);
    expect(kbSortParam(sorting, '  ')).toBe('-modifiedAt');
  });
});
