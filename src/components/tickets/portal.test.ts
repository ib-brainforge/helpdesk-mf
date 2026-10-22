import { describe, expect, it } from 'vitest';
import {
  decodePlainText,
  findConsignmentLink,
  isPortalTicket,
  linkedEntityTypeLabel,
} from './portal';

describe('isPortalTicket', () => {
  it('is true only for the Portal origin', () => {
    expect(isPortalTicket('Portal')).toBe(true);
    expect(isPortalTicket('WebApp')).toBe(false);
    expect(isPortalTicket(undefined)).toBe(false);
  });
});

describe('findConsignmentLink', () => {
  it('returns the earliest consignment link and ignores other records', () => {
    const link = findConsignmentLink([
      { id: '1', entityType: 'asset', displayReference: 'A-1' },
      {
        id: '2',
        entityType: 'freight.consignment',
        displayReference: 'C-2',
        linkedAt: '2026-01-02T00:00:00Z',
      },
      {
        id: '3',
        entityType: 'freight.consignment',
        displayReference: 'C-1',
        linkedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    expect(link?.displayReference).toBe('C-1');
  });

  it('returns undefined when there is no consignment link', () => {
    expect(findConsignmentLink([])).toBeUndefined();
    expect(findConsignmentLink(undefined)).toBeUndefined();
    expect(
      findConsignmentLink([{ id: '1', entityType: 'asset' }]),
    ).toBeUndefined();
  });
});

describe('linkedEntityTypeLabel', () => {
  it('names a consignment and falls back to the raw type', () => {
    expect(linkedEntityTypeLabel('freight.consignment')).toBe('Consignment');
    expect(linkedEntityTypeLabel('asset')).toBe('asset');
    expect(linkedEntityTypeLabel(undefined)).toBe('Record');
  });
});

describe('decodePlainText', () => {
  it('restores encoded characters without producing markup', () => {
    expect(decodePlainText('Tom &amp; Jerry &lt;b&gt;hi&lt;/b&gt;')).toBe(
      'Tom & Jerry <b>hi</b>',
    );
    expect(decodePlainText('say &quot;hi&quot; it&#39;s')).toBe(
      'say "hi" it\'s',
    );
  });

  it('decodes once, so an encoded entity stays literal text', () => {
    expect(decodePlainText('&amp;lt;')).toBe('&lt;');
  });

  it('keeps line breaks and leaves plain text alone', () => {
    expect(decodePlainText('a\nb')).toBe('a\nb');
  });
});
