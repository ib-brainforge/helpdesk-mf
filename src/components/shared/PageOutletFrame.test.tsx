import { PageBody } from '@brainforgeau/components/page';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PAGE_OUTLET_CLASSES, PageOutletFrame } from './PageOutletFrame';

const FixturePage = () => (
  <PageBody>
    <p>content</p>
  </PageBody>
);

describe('PageOutletFrame', () => {
  it('is a stretching flex column with no padding and no overflow', () => {
    const html = renderToStaticMarkup(
      <PageOutletFrame>
        <span />
      </PageOutletFrame>,
    );
    expect(html).toContain(`class="${PAGE_OUTLET_CLASSES}"`);
    expect(PAGE_OUTLET_CLASSES.split(' ')).toEqual(
      expect.arrayContaining(['flex', 'flex-col', 'flex-1', 'min-h-0']),
    );
    expect(PAGE_OUTLET_CLASSES).not.toMatch(/(^| )(p[xytblr]?-|overflow)/);
  });

  it('leaves the 20px gutter to the PageBody inside it', () => {
    const html = renderToStaticMarkup(
      <PageOutletFrame>
        <FixturePage />
      </PageOutletFrame>,
    );
    expect(html).toContain('id="page-main"');
    expect(html).toMatch(/<main[^>]*class="[^"]*\bp-5\b/);
  });
});
