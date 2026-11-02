import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScopeSelect } from './ScopeSelect';

const render = (isRequired?: boolean) =>
  renderToStaticMarkup(
    <ScopeSelect
      label="Organisation"
      options={[{ id: 'o1', name: 'Acme', parentId: 't1' }]}
      value={null}
      onChange={() => {}}
      placeholder="Choose an organisation"
      isRequired={isRequired}
    />,
  );

const ASTERISK = /Organisation<span[^>]*>\*<\/span>/;

describe('ScopeSelect', () => {
  it('shows the required asterisk when isRequired is set', () => {
    expect(render(true)).toMatch(ASTERISK);
  });

  it('shows no asterisk by default', () => {
    expect(render()).not.toMatch(ASTERISK);
  });
});
