import { describe, expect, it } from 'vitest';
import { PORTAL_SECTION_OPTIONS, portalSectionLabel } from './portalSection';

describe('portalSection', () => {
  it('offers every backend value, with None first and shown as Not shown', () => {
    expect(PORTAL_SECTION_OPTIONS.map(o => o.id)).toEqual([
      'None',
      'Help',
      'Announcements',
    ]);
    expect(portalSectionLabel('None')).toBe('Not shown');
    expect(portalSectionLabel('Help')).toBe('Help');
    expect(portalSectionLabel('Announcements')).toBe('Announcements');
  });
});
