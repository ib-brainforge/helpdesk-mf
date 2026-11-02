import { describe, expect, it } from 'vitest';
import { toCreatedTicket } from './created-ticket';

describe('toCreatedTicket', () => {
  it('returns the id and the handling tenant', () => {
    expect(
      toCreatedTicket({ id: 't1', handledByTenantId: 'tenant-a' }),
    ).toEqual({
      id: 't1',
      handledByTenantId: 'tenant-a',
    });
  });

  it('throws when the id is missing', () => {
    expect(() => toCreatedTicket({ handledByTenantId: 'tenant-a' })).toThrow(
      'Unexpected response from POST v1/tickets',
    );
  });

  it('throws when the handling tenant is missing', () => {
    expect(() => toCreatedTicket({ id: 't1' })).toThrow(
      'Unexpected response from POST v1/tickets',
    );
  });

  it('throws on an empty body', () => {
    expect(() => toCreatedTicket(undefined)).toThrow();
    expect(() => toCreatedTicket(null)).toThrow();
  });
});
