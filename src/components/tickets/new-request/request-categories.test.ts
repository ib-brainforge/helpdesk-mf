import { describe, expect, it } from 'vitest';
import {
  cardOf,
  groupCategories,
  handledByBadgeLabel,
  sentToLabel,
} from './request-categories';

const OWN = 'tenant-own';
const PROVIDER = 'tenant-provider';
const OWNER = 'tenant-owner';

const own = {
  id: 'c-own',
  name: 'Our printers',
  level: 0,
  handledBy: 'Local' as const,
  ownerTenantId: OWN,
};
const providerVehicle = {
  id: 'c-p1',
  name: "Issue with a vehicle's GPS tracking hardware or ability to track",
  level: 1,
  handledBy: 'Provider' as const,
  ownerTenantId: PROVIDER,
};
const platformOther = {
  id: 'c-n1',
  name: 'Problem with apps or something else',
  level: 2,
  handledBy: 'Platform' as const,
  ownerTenantId: OWNER,
};

describe('groupCategories', () => {
  it('groups in chain order with names resolved', () => {
    const groups = groupCategories([platformOther, providerVehicle, own], {
      [PROVIDER]: 'Acme Telematics',
    });
    expect(groups.map(g => g.handledBy)).toEqual([
      'Local',
      'Provider',
      'Platform',
    ]);
    expect(groups.map(g => g.title)).toEqual([
      'Your helpdesk',
      'Your provider · Acme Telematics',
      'Netcorp',
    ]);
    expect(groups[1].ownerTenantId).toBe(PROVIDER);
  });

  it('hides "Your helpdesk" when the tenant has no categories of its own', () => {
    const groups = groupCategories([providerVehicle, platformOther]);
    expect(groups.map(g => g.title)).toEqual(['Your provider', 'Netcorp']);
  });

  it('derives the handler from the level when handledBy is absent', () => {
    const groups = groupCategories([
      { id: 'a', level: 0 },
      { id: 'b', level: 1 },
      { id: 'c', level: 2 },
    ]);
    expect(groups.map(g => g.handledBy)).toEqual([
      'Local',
      'Provider',
      'Platform',
    ]);
  });

  it('leaves out rows without an id', () => {
    expect(groupCategories([{ name: 'x' }])).toEqual([]);
  });
});

describe('cardOf', () => {
  it("reads the card and the questions from the category's own fields", () => {
    const fields = [
      {
        id: 'f-1',
        name: 'Choose vehicle(s)',
        fieldType: 'Asset' as const,
        isRequired: true,
        options: [],
      },
    ];
    const card = cardOf({
      ...providerVehicle,
      icon: 'TruckIcon',
      note: 'Refresh first',
      questionsHeading: 'About the vehicle',
      isRemote: false,
      fields,
    });
    expect(card).toEqual({
      id: 'c-p1',
      label: providerVehicle.name,
      icon: 'TruckIcon',
      summary: '',
      note: 'Refresh first',
      heading: 'About the vehicle',
      remote: false,
      fields,
    });
  });

  it('gives a category with nothing configured a plain card and no questions', () => {
    const card = cardOf({ ...own, description: 'Toner and jams' });
    expect(card.icon).toBe('TicketIcon');
    expect(card.summary).toBe('Toner and jams');
    expect(card.remote).toBe(false);
    expect(card.fields).toEqual([]);
  });
});

describe('sentToLabel', () => {
  it('names the own helpdesk', () => {
    expect(
      sentToLabel({ handledByTenantId: OWN, ownTenantId: OWN, category: own }),
    ).toBe('Sent to your helpdesk');
  });
  it('names the handling tenant when known, else by level', () => {
    expect(
      sentToLabel({
        handledByTenantId: PROVIDER,
        ownTenantId: OWN,
        category: providerVehicle,
        tenantNames: { [PROVIDER]: 'Acme' },
      }),
    ).toBe('Sent to Acme');
    expect(
      sentToLabel({
        handledByTenantId: PROVIDER,
        ownTenantId: OWN,
        category: providerVehicle,
      }),
    ).toBe('Sent to your provider');
    expect(
      sentToLabel({
        handledByTenantId: OWNER,
        ownTenantId: OWN,
        category: platformOther,
      }),
    ).toBe('Sent to Netcorp');
  });
});

describe('handledByBadgeLabel', () => {
  it('is hidden for local tickets', () => {
    expect(handledByBadgeLabel(0)).toBeNull();
    expect(handledByBadgeLabel(undefined)).toBeNull();
  });
  it('names the handler', () => {
    expect(handledByBadgeLabel(1)).toBe('Provider');
    expect(handledByBadgeLabel(2)).toBe('Netcorp');
    expect(handledByBadgeLabel(1, 'Acme')).toBe('Acme');
  });
});
