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

  it('compares link times as dates, not strings', () => {
    const link = findConsignmentLink([
      {
        entityType: 'freight.consignment',
        displayReference: 'first-by-instant',
        linkedAt: '2026-01-01T10:00:00+02:00',
      },
      {
        entityType: 'freight.consignment',
        displayReference: 'second-by-instant',
        linkedAt: '2026-01-01T09:00:00Z',
      },
    ]);
    expect(link?.displayReference).toBe('first-by-instant');
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
  it('decodes named and numeric entities', () => {
    expect(decodePlainText('Tom &amp; Jerry &lt;b&gt;hi&lt;/b&gt;')).toBe(
      'Tom & Jerry <b>hi</b>',
    );
    expect(decodePlainText('caf&#233;')).toBe('café');
    expect(decodePlainText('&#128512;')).toBe('\u{1F600}');
    expect(decodePlainText('it&#x27;s')).toBe("it's");
  });

  it('decodes once, so a double-encoded entity stays literal text', () => {
    expect(decodePlainText('&amp;#39;')).toBe('&#39;');
  });

  it('keeps a raw tag as text instead of parsing it', () => {
    expect(decodePlainText('<img src=x onerror=alert(1)>')).toBe(
      '<img src=x onerror=alert(1)>',
    );
  });

  it('keeps line breaks and handles empty input', () => {
    expect(decodePlainText('a\nb')).toBe('a\nb');
    expect(decodePlainText(undefined)).toBe('');
  });
});
