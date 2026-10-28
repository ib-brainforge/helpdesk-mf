/**
 * The two views Helpdesk offers: Tenant (the tenant's own tickets, knowledge
 * base and "Raised with our provider") and Provider (a provider's office
 * working its tenants' tickets). Which views a person holds comes from the
 * `pos` claim, read through usePosition; this file only says which URLs belong
 * to which view.
 *
 * Tenant pages sit at the root (/tickets, /dashboard...). The Provider view's
 * pages sit under /provider/dashboard, /provider/tickets, /provider/deadlines,
 * /provider/categories and /provider/reports.
 * /provider/raised is NOT in the Provider view: it is the Tenant view's
 * "Raised with our provider" list.
 */
export type HelpdeskView = 'tenant' | 'provider';

const PROVIDER_VIEW_PATH =
  /^\/provider(\/(dashboard|tickets|deadlines|categories|reports)(\/|$)|\/?$)/;

/** The view a URL (pathname without the app's base path) belongs to. */
export const viewForPath = (pathname: string): HelpdeskView =>
  PROVIDER_VIEW_PATH.test(pathname) ? 'provider' : 'tenant';

/** Where the Provider view segment goes; the page there picks the first allowed page. */
export const PROVIDER_VIEW_HOME = '/provider';

/** Where the Tenant view segment goes. */
export const TENANT_VIEW_HOME = '/';

/** Contact page, linked from other apps' help widgets and relationship pages. */
export const CONTACT_PROVIDER_PATH = '/contact-provider';

/** "Raised with our provider": the list, and a ticket under it. */
export const RAISED_WITH_PROVIDER_PATH = '/provider/raised';
