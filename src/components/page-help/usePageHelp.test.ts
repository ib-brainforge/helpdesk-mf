import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = {
  v1HelpPagesPageKeyGet: vi.fn(),
  v1HelpWhatsNewUnreadCountGet: vi.fn(),
  v1HelpWhatsNewGet: vi.fn(),
};

vi.mock('@/state/helpdeskApiClient', () => ({
  createHelpdeskApiClient: async () => client,
}));

import {
  getPageHelp,
  getWhatsNew,
  getWhatsNewUnreadCount,
} from './usePageHelp';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getPageHelp', () => {
  it('returns the articles of the page', async () => {
    client.v1HelpPagesPageKeyGet.mockResolvedValue({
      data: [{ id: 'a1', title: 'Tickets' }],
    });
    expect(await getPageHelp('tickets')).toEqual([
      { id: 'a1', title: 'Tickets' },
    ]);
    expect(client.v1HelpPagesPageKeyGet).toHaveBeenCalledWith('tickets');
  });

  it('is empty when the body is missing', async () => {
    client.v1HelpPagesPageKeyGet.mockResolvedValue({ data: undefined });
    expect(await getPageHelp('tickets')).toEqual([]);
  });

  it('drops an article without an id', async () => {
    client.v1HelpPagesPageKeyGet.mockResolvedValue({
      data: [{ title: 'No id' }, { id: 'a2' }],
    });
    expect(await getPageHelp('tickets')).toEqual([{ id: 'a2' }]);
  });
});

describe('getWhatsNewUnreadCount', () => {
  it('returns the count', async () => {
    client.v1HelpWhatsNewUnreadCountGet.mockResolvedValue({
      data: { count: 3 },
    });
    expect(await getWhatsNewUnreadCount()).toBe(3);
  });

  it('is 0 when the count or body is missing', async () => {
    client.v1HelpWhatsNewUnreadCountGet.mockResolvedValue({ data: {} });
    expect(await getWhatsNewUnreadCount()).toBe(0);
    client.v1HelpWhatsNewUnreadCountGet.mockResolvedValue({ data: undefined });
    expect(await getWhatsNewUnreadCount()).toBe(0);
  });
});

describe('getWhatsNew', () => {
  it('returns the items of the first page', async () => {
    client.v1HelpWhatsNewGet.mockResolvedValue({
      data: { items: [{ id: 'n1', isRead: false }] },
    });
    expect(await getWhatsNew()).toEqual([{ id: 'n1', isRead: false }]);
    expect(client.v1HelpWhatsNewGet).toHaveBeenCalledWith(undefined, 1, 20);
  });

  it('is empty when there are no items', async () => {
    client.v1HelpWhatsNewGet.mockResolvedValue({ data: {} });
    expect(await getWhatsNew()).toEqual([]);
    client.v1HelpWhatsNewGet.mockResolvedValue({ data: undefined });
    expect(await getWhatsNew()).toEqual([]);
  });

  it('drops an entry without an id', async () => {
    client.v1HelpWhatsNewGet.mockResolvedValue({
      data: { items: [{ isRead: true }, { id: 'n2' }] },
    });
    expect(await getWhatsNew()).toEqual([{ id: 'n2' }]);
  });
});
