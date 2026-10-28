/**
 * Breadcrumb registry for helpdesk-mf.
 *
 * Keys use dotted navigation notation (NOT URL hierarchy).
 * Factory functions receive typed params and return readonly BreadcrumbItem chains.
 *
 * Rules:
 *  - `labelKey` for static copy (resolved via humanise() until i18n is wired)
 *  - `label: string` for dynamic data (entity names, IDs) and acronyms (HR, SLA, AI)
 *    because humanise() produces wrong casing for acronyms
 *  - `href` on intermediate crumbs so users can navigate back, except
 *    Configuration, which is a menu group with no page of its own
 *  - The leading Helpdesk crumb goes to Tickets, the app's home
 *
 * Coverage: all 73 route page.tsx files.
 * Out of scope (per design doc): workflow-editor and automation-editor internal pages.
 */

import type { BreadcrumbRegistry } from '@brainforgeau/components/page';

// ---------------------------------------------------------------------------
// Root / landing
// ---------------------------------------------------------------------------

// routes/page.tsx  (root redirect / landing)
// routes/satisfaction/page.tsx
// routes/dashboard/page.tsx
// routes/ideas/page.tsx

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

// routes/tickets/page.tsx
// routes/tickets/new/page.tsx
// routes/tickets/[id]/page.tsx

// ---------------------------------------------------------------------------
// Configuration (tenant-scoped, __sidebar)
// ---------------------------------------------------------------------------

// routes/__sidebar/configuration/categories/page.tsx
// routes/__sidebar/configuration/custom-statuses/page.tsx
// routes/__sidebar/configuration/custom-priorities/page.tsx
// routes/__sidebar/configuration/custom-fields/page.tsx
// routes/__sidebar/configuration/canned-responses/page.tsx
// components/integrations/IntegrationsConfigPage.tsx (hidden, no route)
// components/live-chat/LiveChatConfigPage.tsx (hidden, no route)
// routes/__sidebar/configuration/import-export/page.tsx
// routes/__sidebar/configuration/approval-workflows/page.tsx
// routes/__sidebar/configuration/approval-workflows/new/page.tsx
// routes/__sidebar/configuration/approval-workflows/[id]/page.tsx

// routes/configuration/automations/page.tsx
// routes/configuration/automations/[projectId]/page.tsx
// routes/configuration/automations/[projectId]/rules/[ruleId]/page.tsx
// routes/configuration/workflows/page.tsx
// routes/configuration/workflows/[id]/page.tsx
// routes/configuration/workflows/_admin/rule-migration-report/page.tsx

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

// routes/__sidebar/reports/page.tsx
// routes/__sidebar/reports/satisfaction/page.tsx
// routes/__sidebar/reports/deleted/page.tsx
// routes/__sidebar/reports/audit/page.tsx
// routes/__sidebar/reports/assets/page.tsx

// ---------------------------------------------------------------------------
// Approvals (tenant-scoped)
// ---------------------------------------------------------------------------

// routes/__sidebar/approvals/page.tsx

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

// routes/__sidebar/admin/settings/page.tsx
// routes/__sidebar/admin/users/page.tsx

// ---------------------------------------------------------------------------
// Knowledge base
// ---------------------------------------------------------------------------

// routes/__sidebar/knowledge-base/page.tsx
// routes/__sidebar/knowledge-base/new/page.tsx
// routes/__sidebar/knowledge-base/[slug]/page.tsx
// routes/__sidebar/knowledge-base/[slug]/edit/page.tsx
// routes/__sidebar/knowledge-base/category/[categorySlug]/page.tsx
// routes/__sidebar/knowledge-base/search/page.tsx
// routes/__sidebar/knowledge-base/settings/page.tsx

// ---------------------------------------------------------------------------
// Provider support (Tenant view)
// ---------------------------------------------------------------------------

// routes/contact-provider/page.tsx
// routes/provider/raised/page.tsx
// routes/provider/raised/[id]/page.tsx

// ---------------------------------------------------------------------------
// Provider view
// ---------------------------------------------------------------------------

// routes/provider/deadlines/page.tsx
// routes/provider/deadlines/[tenantId]/page.tsx
// routes/provider/categories/page.tsx

export const breadcrumbs = {
  // -------------------------------------------------------------------------
  // Root / landing
  // -------------------------------------------------------------------------

  /** routes/page.tsx — root landing / redirect */
  home: () => [{ labelKey: 'helpdesk', href: '/tickets' }],

  /** routes/dashboard/page.tsx */
  dashboard: () => [{ labelKey: 'helpdesk.dashboard' }],

  /** routes/satisfaction/page.tsx */
  satisfaction: () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.satisfaction' },
  ],

  /** routes/ideas/page.tsx */
  'ideas.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.ideas', href: '/ideas' },
  ],

  // -------------------------------------------------------------------------
  // Tickets
  // -------------------------------------------------------------------------

  /** routes/tickets/page.tsx */
  'tickets.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.tickets', href: '/tickets' },
  ],

  /** routes/tickets/new/page.tsx */
  'tickets.new': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.tickets', href: '/tickets' },
    { labelKey: 'helpdesk.tickets.new' },
  ],

  /** routes/tickets/[id]/page.tsx */
  'tickets.detail': (params: { id: string; subject: string }) => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.tickets', href: '/tickets' },
    { label: params.subject },
  ],

  // -------------------------------------------------------------------------
  // Configuration — __sidebar (tenant-scoped)
  // -------------------------------------------------------------------------

  /** routes/__sidebar/configuration/categories/page.tsx */
  'configuration.categories.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.categories',
      href: '/configuration/categories',
    },
  ],

  /** routes/__sidebar/configuration/custom-statuses/page.tsx */
  'configuration.custom-statuses.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.custom-statuses',
      href: '/configuration/custom-statuses',
    },
  ],

  /** routes/__sidebar/configuration/custom-priorities/page.tsx */
  'configuration.custom-priorities.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.custom-priorities',
      href: '/configuration/custom-priorities',
    },
  ],

  /** routes/__sidebar/configuration/custom-fields/page.tsx */
  'configuration.custom-fields.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.custom-fields',
      href: '/configuration/custom-fields',
    },
  ],

  /** routes/__sidebar/configuration/canned-responses/page.tsx */
  'configuration.canned-responses.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.canned-responses',
      href: '/configuration/canned-responses',
    },
  ],

  /** components/integrations/IntegrationsConfigPage.tsx (hidden, no route; kept for its return) */
  'configuration.integrations.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.integrations',
      href: '/configuration/integrations',
    },
  ],

  /** components/live-chat/LiveChatConfigPage.tsx (hidden, no route; kept for its return) */
  'configuration.live-chat': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.live-chat',
      href: '/configuration/live-chat',
    },
  ],

  /** routes/__sidebar/configuration/import-export/page.tsx */
  'configuration.import-export': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.import-export',
      href: '/configuration/import-export',
    },
  ],

  /** routes/__sidebar/configuration/approval-workflows/page.tsx */
  'configuration.approval-workflows.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.approval-workflows',
      href: '/configuration/approval-workflows',
    },
  ],

  /** routes/__sidebar/configuration/approval-workflows/new/page.tsx */
  'configuration.approval-workflows.new': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.approval-workflows',
      href: '/configuration/approval-workflows',
    },
    { labelKey: 'helpdesk.configuration.approval-workflows.new' },
  ],

  /** routes/__sidebar/configuration/approval-workflows/[id]/page.tsx */
  'configuration.approval-workflows.detail': (params: {
    id: string;
    name: string;
  }) => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.approval-workflows',
      href: '/configuration/approval-workflows',
    },
    { label: params.name },
  ],

  // -------------------------------------------------------------------------
  // Configuration — route-based (non-__sidebar)
  // -------------------------------------------------------------------------

  /** routes/configuration/automations/page.tsx */
  'configuration.automations.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.automations',
      href: '/configuration/automations',
    },
  ],

  /** routes/configuration/automations/[projectId]/page.tsx */
  'configuration.automations.project': (params: {
    projectId: string;
    projectName: string;
  }) => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.automations',
      href: '/configuration/automations',
    },
    { label: params.projectName },
  ],

  /** routes/configuration/automations/[projectId]/rules/[ruleId]/page.tsx */
  'configuration.automations.rule': (params: {
    projectId: string;
    projectName: string;
    ruleId: string;
    ruleName: string;
  }) => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.automations',
      href: '/configuration/automations',
    },
    {
      label: params.projectName,
      href: `/configuration/automations/${params.projectId}`,
    },
    { label: params.ruleName },
  ],

  /** routes/configuration/workflows/page.tsx */
  'configuration.workflows.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.workflows',
      href: '/configuration/workflows',
    },
  ],

  /** routes/configuration/workflows/[id]/page.tsx */
  'configuration.workflows.detail': (params: { id: string; name: string }) => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.workflows',
      href: '/configuration/workflows',
    },
    { label: params.name },
  ],

  /** routes/configuration/workflows/_admin/rule-migration-report/page.tsx */
  'configuration.workflows.rule-migration-report': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.configuration' },
    {
      labelKey: 'helpdesk.configuration.workflows',
      href: '/configuration/workflows',
    },
    { labelKey: 'helpdesk.configuration.workflows.rule-migration-report' },
  ],

  // -------------------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------------------

  /** routes/__sidebar/reports/page.tsx */
  'reports.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
  ],

  /** routes/__sidebar/reports/satisfaction/page.tsx */
  'reports.satisfaction': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.satisfaction' },
  ],

  /** routes/__sidebar/reports/deleted/page.tsx */
  'reports.deleted': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.deleted' },
  ],

  /** routes/__sidebar/reports/audit/page.tsx */
  'reports.audit': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.audit' },
  ],

  /** routes/__sidebar/reports/assets/page.tsx */
  'reports.assets': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.assets' },
  ],

  // -------------------------------------------------------------------------
  // Approvals (tenant-scoped)
  // -------------------------------------------------------------------------

  /** routes/__sidebar/approvals/page.tsx */
  'approvals.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.approvals', href: '/approvals' },
  ],

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  /** routes/__sidebar/admin/settings/page.tsx */
  'admin.settings': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.admin', href: '/admin/settings' },
    { labelKey: 'helpdesk.admin.settings' },
  ],

  /** routes/__sidebar/admin/users/page.tsx */
  'admin.users': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.admin', href: '/admin/settings' },
    { labelKey: 'helpdesk.admin.users' },
  ],

  // -------------------------------------------------------------------------
  // Knowledge base
  // -------------------------------------------------------------------------

  /** routes/__sidebar/knowledge-base/page.tsx */
  'knowledge-base.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
  ],

  /** routes/__sidebar/knowledge-base/new/page.tsx */
  'knowledge-base.new': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { labelKey: 'helpdesk.knowledge-base.new' },
  ],

  /** routes/__sidebar/knowledge-base/[slug]/page.tsx */
  'knowledge-base.article': (params: { slug: string; title: string }) => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { label: params.title },
  ],

  /** routes/__sidebar/knowledge-base/[slug]/edit/page.tsx */
  'knowledge-base.article.edit': (params: { slug: string; title: string }) => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { label: params.title, href: `/knowledge-base/${params.slug}` },
    { labelKey: 'helpdesk.knowledge-base.edit' },
  ],

  /** routes/__sidebar/knowledge-base/category/[categorySlug]/page.tsx */
  'knowledge-base.category': (params: {
    categorySlug: string;
    categoryName: string;
  }) => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { label: params.categoryName },
  ],

  /** routes/__sidebar/knowledge-base/search/page.tsx */
  'knowledge-base.search': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { labelKey: 'helpdesk.knowledge-base.search' },
  ],

  /** routes/__sidebar/knowledge-base/settings/page.tsx */
  'knowledge-base.settings': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { labelKey: 'helpdesk.knowledge-base.settings' },
  ],

  // -------------------------------------------------------------------------
  // Provider support (Tenant view)
  // -------------------------------------------------------------------------

  /** routes/contact-provider/page.tsx */
  'provider.contact': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.contact-provider' },
  ],

  /** routes/provider/raised/page.tsx */
  'provider.raised.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    {
      labelKey: 'helpdesk.provider-raised',
      href: '/provider/raised',
    },
  ],

  /** routes/provider/raised/[id]/page.tsx */
  'provider.raised.detail': (params: { id: string; subject: string }) => [
    { labelKey: 'helpdesk', href: '/tickets' },
    {
      labelKey: 'helpdesk.provider-raised',
      href: '/provider/raised',
    },
    { label: params.subject },
  ],
  // -------------------------------------------------------------------------
  // Provider view
  // -------------------------------------------------------------------------

  /** routes/provider/deadlines/page.tsx */
  'provider.deadlines.list': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    {
      labelKey: 'helpdesk.provider-deadlines',
      href: '/provider/deadlines',
    },
  ],

  /** routes/provider/deadlines/[tenantId]/page.tsx */
  'provider.deadlines.detail': (params: { name: string }) => [
    { labelKey: 'helpdesk', href: '/tickets' },
    {
      labelKey: 'helpdesk.provider-deadlines',
      href: '/provider/deadlines',
    },
    { label: params.name },
  ],

  /** routes/provider/categories/page.tsx */
  'provider.categories': () => [
    { labelKey: 'helpdesk', href: '/tickets' },
    { labelKey: 'helpdesk.provider-categories' },
  ],
} satisfies BreadcrumbRegistry;

export type BreadcrumbKey = keyof typeof breadcrumbs;
