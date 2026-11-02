import { describe, expect, it } from 'vitest';
import {
  isHandledAbove,
  isHandledAboveSearch,
  replyToHtml,
  selectableRows,
  ticketPageFor,
  ticketPath,
} from './handled-above';

describe('handled above', () => {
  it('reads the row level', () => {
    expect(isHandledAbove({ handledByLevel: 0 })).toBe(false);
    expect(isHandledAbove({})).toBe(false);
    expect(isHandledAbove({ handledByLevel: 1 })).toBe(true);
    expect(isHandledAbove({ handledByLevel: 2 })).toBe(true);
  });

  it('marks the URL of a ticket handled above', () => {
    expect(ticketPath('t1', false)).toBe('/tickets/t1');
    const path = ticketPath('t1', true);
    expect(path).toBe('/tickets/t1?handledBy=above');
    expect(isHandledAboveSearch(new URLSearchParams(path.split('?')[1]))).toBe(
      true,
    );
    expect(isHandledAboveSearch(new URLSearchParams(''))).toBe(false);
  });
});

describe('replyToHtml', () => {
  it('escapes markup and keeps paragraphs and line breaks', () => {
    expect(replyToHtml('  Hi <b>team</b> & co\nline two\n\nNext  ')).toBe(
      '<p>Hi &lt;b&gt;team&lt;/b&gt; &amp; co<br>line two</p><p>Next</p>',
    );
  });
});

describe('ticketPageFor', () => {
  it('opens the projection when marked or when the own lookup is a 404', () => {
    expect(ticketPageFor(true, null)).toBe('raised-above');
    expect(ticketPageFor(false, { response: { status: 404 } })).toBe(
      'raised-above',
    );
  });
  it("keeps the tenant's own page otherwise", () => {
    expect(ticketPageFor(false, null)).toBe('own');
    expect(ticketPageFor(false, { response: { status: 500 } })).toBe('own');
    expect(ticketPageFor(false, new Error('network'))).toBe('own');
  });
});

describe('selectableRows', () => {
  it('leaves out rows handled above and rows without an id', () => {
    const rows = [
      { id: 'a', handledByLevel: 0 },
      { id: 'b', handledByLevel: 1 },
      { handledByLevel: 0 },
      { id: 'c' },
    ];
    expect(selectableRows(rows).map(r => r.id)).toEqual(['a', 'c']);
  });
});
