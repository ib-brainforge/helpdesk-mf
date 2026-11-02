import type { KnowledgeBaseCategoryDto } from '@/types';
import { describe, expect, it } from 'vitest';
import { buildCategoryRows } from './categoryRows';

const cat = (id: string, name: string, parentId?: string) =>
  ({ id, name, parentId }) as KnowledgeBaseCategoryDto;

const list = [
  cat('a', 'Alpha'),
  cat('a1', 'Alpha child', 'a'),
  cat('b', 'Beta'),
  cat('a1x', 'Deep one', 'a1'),
  cat('b1', 'Beta child', 'b'),
];

describe('buildCategoryRows', () => {
  it('places each sub-category under its parent with its depth', () => {
    expect(buildCategoryRows(list, '').map(r => [r.id, r.depth])).toEqual([
      ['a', 0],
      ['a1', 1],
      ['a1x', 2],
      ['b', 0],
      ['b1', 1],
    ]);
  });

  it('keeps a match whose parent is filtered out, at its real depth', () => {
    expect(buildCategoryRows(list, 'deep').map(r => [r.id, r.depth])).toEqual([
      ['a1x', 2],
    ]);
  });

  it('searches case-insensitively and keeps matched children under matched parents', () => {
    expect(buildCategoryRows(list, 'ALPHA').map(r => r.id)).toEqual([
      'a',
      'a1',
    ]);
  });

  it('survives a parent cycle', () => {
    const cyclic = [cat('x', 'X', 'y'), cat('y', 'Y', 'x')];
    expect(
      buildCategoryRows(cyclic, '')
        .map(r => r.id)
        .sort(),
    ).toEqual(['x', 'y']);
  });
});
