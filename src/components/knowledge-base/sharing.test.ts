import { describe, expect, it } from 'vitest';
import {
  SHARING_OPTIONS,
  STAFF_SECTION_OPTIONS,
  ownerBadgeLabel,
  sharingLabel,
  staffSectionLabel,
} from './sharing';

describe('sharing', () => {
  it('offers every backend value, with Internal first', () => {
    expect(SHARING_OPTIONS.map(o => o.id)).toEqual([
      'Internal',
      'Customers',
      'AllBelow',
    ]);
    expect(sharingLabel('Internal')).toBe('This tenant only');
    expect(sharingLabel('AllBelow')).toBe('Our tenants and theirs');
  });

  it('offers every staff section, with None first and shown as Not shown', () => {
    expect(STAFF_SECTION_OPTIONS.map(o => o.id)).toEqual([
      'None',
      'Help',
      'WhatsNew',
    ]);
    expect(staffSectionLabel('None')).toBe('Not shown');
    expect(staffSectionLabel('WhatsNew')).toBe("What's new");
  });
});

describe('ownerBadgeLabel', () => {
  const names = { owner: 'Netcorp' };

  it('gives the tenant’s own articles no badge', () => {
    expect(
      ownerBadgeLabel({ isInherited: false, ownerTenantId: 'owner' }, names),
    ).toBeUndefined();
    expect(ownerBadgeLabel({}, names)).toBeUndefined();
  });

  it('names the owner of an inherited article', () => {
    expect(
      ownerBadgeLabel({ isInherited: true, ownerTenantId: 'owner' }, names),
    ).toBe('From Netcorp');
  });

  it('falls back to a neutral word when the name cannot be read', () => {
    expect(
      ownerBadgeLabel({ isInherited: true, ownerTenantId: 'other' }, names),
    ).toBe('Shared with you');
  });
});
