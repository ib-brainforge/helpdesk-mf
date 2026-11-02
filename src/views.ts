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
 * /provider/raised is NOT in the Provider view: it redirects to the Tenant
 * view's "Raised with our provider" preset of the ticket list.
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

/**
 * "Raised with our provider": a preset of the one ticket list (only tickets a
 * helpdesk above the tenant works). /provider/raised redirects here.
 */
export const RAISED_WITH_PROVIDER_PATH = '/tickets?raised=1';
