import { describe, expect, it } from 'vitest';
import {
  buildCreateArticleCommand,
  buildUpdateArticleCommand,
} from './articleCommands';
import {
  MAX_PAGE_KEYS,
  normalisePageKey,
  normalisePageKeys,
  validatePageKey,
  validatePageKeys,
} from './pageKeys';

describe('pageKeys', () => {
  it('trims and lower-cases', () => {
    expect(normalisePageKey('  Helpdesk.Knowledge-Base ')).toBe(
      'helpdesk.knowledge-base',
    );
  });

  it('de-duplicates after normalising and drops blanks', () => {
    expect(normalisePageKeys(['A.b', ' a.B ', '', 'c'])).toEqual(['a.b', 'c']);
  });

  it('accepts dotted keys', () => {
    expect(validatePageKey('helpdesk.knowledge-base')).toBeNull();
    expect(validatePageKey('logistics.freight-consignment')).toBeNull();
    expect(validatePageKey('home')).toBeNull();
    expect(validatePageKey('a_b.c-d')).toBeNull();
  });

  it.each(['', '.a', 'a.', 'a..b', '-a', 'a b', 'a/b', 'A.b'])(
    'rejects %j',
    key => {
      expect(validatePageKey(key)).not.toBeNull();
    },
  );

  it('rejects a key over 200 characters', () => {
    expect(validatePageKey('a'.repeat(200))).toBeNull();
    expect(validatePageKey('a'.repeat(201))).not.toBeNull();
  });

  it('allows at most 10 distinct keys', () => {
    const keys = Array.from({ length: MAX_PAGE_KEYS }, (_, i) => `k${i}`);
    expect(validatePageKeys(keys)).toBeNull();
    expect(validatePageKeys([...keys, 'extra'])).not.toBeNull();
    expect(validatePageKeys([...keys, 'K0'])).toBeNull();
  });

  it('reports the first invalid key in a list', () => {
    expect(validatePageKeys(['ok', 'bad key'])).toContain('bad key');
  });
});

describe('article commands', () => {
  const base = {
    title: 't',
    body: 'b',
    accessLevel: 'Public' as never,
    status: 'Draft' as never,
  };

  it('sends normalised pageKeys on create, [] when none', () => {
    expect(
      buildCreateArticleCommand({ ...base, pageKeys: [' A.b ', 'a.b'] })
        .pageKeys,
    ).toEqual(['a.b']);
    expect(buildCreateArticleCommand(base).pageKeys).toEqual([]);
  });

  it('leaves pageKeys unchanged on update when not provided', () => {
    expect(buildUpdateArticleCommand('1', {}).pageKeys).toBeUndefined();
  });

  it('replaces pageKeys on update, [] clears', () => {
    expect(
      buildUpdateArticleCommand('1', { pageKeys: ['X.y'] }).pageKeys,
    ).toEqual(['x.y']);
    expect(buildUpdateArticleCommand('1', { pageKeys: [] }).pageKeys).toEqual(
      [],
    );
    expect(buildUpdateArticleCommand('1', { pageKeys: [] }).id).toBe('1');
  });
});
