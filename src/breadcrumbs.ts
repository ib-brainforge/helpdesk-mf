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
 *  - `href` on all intermediate crumbs so users can navigate back
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
// routes/__sidebar/configuration/integrations/page.tsx
// routes/__sidebar/configuration/live-chat/page.tsx
// routes/__sidebar/configuration/import-export/page.tsx
// routes/__sidebar/configuration/approval-workflows/page.tsx
// routes/__sidebar/configuration/approval-workflows/new/page.tsx
// routes/__sidebar/configuration/approval-workflows/[id]/page.tsx

// routes/configuration/page.tsx  (configuration hub)
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
// routes/__sidebar/reports-hub/page.tsx
// routes/__sidebar/reports/summary/page.tsx
// routes/__sidebar/reports/by-category/page.tsx
// routes/__sidebar/reports/by-priority/page.tsx
// routes/__sidebar/reports/by-status/page.tsx
// routes/__sidebar/reports/sla/page.tsx
// routes/__sidebar/reports/satisfaction/page.tsx
// routes/__sidebar/reports/utilization/page.tsx
// routes/__sidebar/reports/overdue/page.tsx
// routes/__sidebar/reports/deleted/page.tsx
// routes/__sidebar/reports/audit/page.tsx
// routes/__sidebar/reports/assets/page.tsx
// routes/__sidebar/reports/companies/page.tsx

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
// Principal-scoped routes  /principal/[principalId]/...
// ---------------------------------------------------------------------------

// routes/principal/[principalId]/page.tsx
// routes/principal/[principalId]/tickets/page.tsx
// routes/principal/[principalId]/tickets/new/page.tsx
// routes/principal/[principalId]/tickets/[ticketId]/page.tsx
// routes/principal/[principalId]/approvals/page.tsx
// routes/principal/[principalId]/approvals/new/page.tsx
// routes/principal/[principalId]/approvals/[id]/page.tsx
// routes/principal/[principalId]/categories/page.tsx
// routes/principal/[principalId]/categories/new/page.tsx
// routes/principal/[principalId]/categories/[id]/page.tsx
// routes/principal/[principalId]/sla-policies/page.tsx
// routes/principal/[principalId]/sla-policies/new/page.tsx
// routes/principal/[principalId]/sla-policies/[id]/page.tsx
// routes/principal/[principalId]/workflows/page.tsx
// routes/principal/[principalId]/workflows/[id]/page.tsx
// routes/principal/[principalId]/automations/page.tsx
// routes/principal/[principalId]/automations/[projectId]/page.tsx
// routes/principal/[principalId]/automations/[projectId]/rules/[ruleId]/page.tsx
// routes/principal/[principalId]/reports/page.tsx
// routes/principal/[principalId]/settings/page.tsx

export const breadcrumbs = {
  // -------------------------------------------------------------------------
  // Root / landing
  // -------------------------------------------------------------------------

  /** routes/page.tsx — root landing / redirect */
  home: () => [{ labelKey: 'helpdesk' }],

  /** routes/dashboard/page.tsx */
  dashboard: () => [{ labelKey: 'helpdesk.dashboard' }],

  /** routes/satisfaction/page.tsx */
  satisfaction: () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.satisfaction' },
  ],

  /** routes/ideas/page.tsx */
  'ideas.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.ideas', href: '/ideas' },
  ],

  // -------------------------------------------------------------------------
  // Tickets
  // -------------------------------------------------------------------------

  /** routes/tickets/page.tsx */
  'tickets.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.tickets', href: '/tickets' },
  ],

  /** routes/tickets/new/page.tsx */
  'tickets.new': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.tickets', href: '/tickets' },
    { labelKey: 'helpdesk.tickets.new' },
  ],

  /** routes/tickets/[id]/page.tsx */
  'tickets.detail': (params: { id: string; subject: string }) => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.tickets', href: '/tickets' },
    { label: params.subject },
  ],

  // -------------------------------------------------------------------------
  // Configuration — __sidebar (tenant-scoped)
  // -------------------------------------------------------------------------

  /** routes/__sidebar/configuration/categories/page.tsx */
  'configuration.categories.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.categories',
      href: '/configuration/categories',
    },
  ],

  /** routes/__sidebar/configuration/custom-statuses/page.tsx */
  'configuration.custom-statuses.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.custom-statuses',
      href: '/configuration/custom-statuses',
    },
  ],

  /** routes/__sidebar/configuration/custom-priorities/page.tsx */
  'configuration.custom-priorities.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.custom-priorities',
      href: '/configuration/custom-priorities',
    },
  ],

  /** routes/__sidebar/configuration/custom-fields/page.tsx */
  'configuration.custom-fields.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.custom-fields',
      href: '/configuration/custom-fields',
    },
  ],

  /** routes/__sidebar/configuration/canned-responses/page.tsx */
  'configuration.canned-responses.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.canned-responses',
      href: '/configuration/canned-responses',
    },
  ],

  /** routes/__sidebar/configuration/integrations/page.tsx */
  'configuration.integrations.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.integrations',
      href: '/configuration/integrations',
    },
  ],

  /** routes/__sidebar/configuration/live-chat/page.tsx */
  'configuration.live-chat': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.live-chat',
      href: '/configuration/live-chat',
    },
  ],

  /** routes/__sidebar/configuration/import-export/page.tsx */
  'configuration.import-export': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.import-export',
      href: '/configuration/import-export',
    },
  ],

  /** routes/__sidebar/configuration/approval-workflows/page.tsx */
  'configuration.approval-workflows.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.approval-workflows',
      href: '/configuration/approval-workflows',
    },
  ],

  /** routes/__sidebar/configuration/approval-workflows/new/page.tsx */
  'configuration.approval-workflows.new': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
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
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.approval-workflows',
      href: '/configuration/approval-workflows',
    },
    { label: params.name },
  ],

  // -------------------------------------------------------------------------
  // Configuration — route-based (non-__sidebar)
  // -------------------------------------------------------------------------

  /** routes/configuration/page.tsx — configuration hub */
  'configuration.hub': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
  ],

  /** routes/configuration/automations/page.tsx */
  'configuration.automations.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
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
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
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
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
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
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.workflows',
      href: '/configuration/workflows',
    },
  ],

  /** routes/configuration/workflows/[id]/page.tsx */
  'configuration.workflows.detail': (params: { id: string; name: string }) => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
    {
      labelKey: 'helpdesk.configuration.workflows',
      href: '/configuration/workflows',
    },
    { label: params.name },
  ],

  /** routes/configuration/workflows/_admin/rule-migration-report/page.tsx */
  'configuration.workflows.rule-migration-report': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.configuration', href: '/configuration' },
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
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
  ],

  /** routes/__sidebar/reports-hub/page.tsx */
  'reports.hub': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
  ],

  /** routes/__sidebar/reports/summary/page.tsx */
  'reports.summary': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.summary' },
  ],

  /** routes/__sidebar/reports/by-category/page.tsx */
  'reports.by-category': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.by-category' },
  ],

  /** routes/__sidebar/reports/by-priority/page.tsx */
  'reports.by-priority': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.by-priority' },
  ],

  /** routes/__sidebar/reports/by-status/page.tsx */
  'reports.by-status': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.by-status' },
  ],

  /** routes/__sidebar/reports/sla/page.tsx — "SLA" is an acronym, use label not labelKey */
  'reports.sla': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { label: 'SLA' },
  ],

  /** routes/__sidebar/reports/satisfaction/page.tsx */
  'reports.satisfaction': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.satisfaction' },
  ],

  /** routes/__sidebar/reports/utilization/page.tsx */
  'reports.utilization': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.utilization' },
  ],

  /** routes/__sidebar/reports/overdue/page.tsx */
  'reports.overdue': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.overdue' },
  ],

  /** routes/__sidebar/reports/deleted/page.tsx */
  'reports.deleted': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.deleted' },
  ],

  /** routes/__sidebar/reports/audit/page.tsx */
  'reports.audit': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.audit' },
  ],

  /** routes/__sidebar/reports/assets/page.tsx */
  'reports.assets': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.assets' },
  ],

  /** routes/__sidebar/reports/companies/page.tsx */
  'reports.companies': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.reports', href: '/reports' },
    { labelKey: 'helpdesk.reports.companies' },
  ],

  // -------------------------------------------------------------------------
  // Approvals (tenant-scoped)
  // -------------------------------------------------------------------------

  /** routes/__sidebar/approvals/page.tsx */
  'approvals.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.approvals', href: '/approvals' },
  ],

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  /** routes/__sidebar/admin/settings/page.tsx */
  'admin.settings': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.admin', href: '/admin/settings' },
    { labelKey: 'helpdesk.admin.settings' },
  ],

  /** routes/__sidebar/admin/users/page.tsx */
  'admin.users': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.admin', href: '/admin/settings' },
    { labelKey: 'helpdesk.admin.users' },
  ],

  // -------------------------------------------------------------------------
  // Knowledge base
  // -------------------------------------------------------------------------

  /** routes/__sidebar/knowledge-base/page.tsx */
  'knowledge-base.list': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
  ],

  /** routes/__sidebar/knowledge-base/new/page.tsx */
  'knowledge-base.new': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { labelKey: 'helpdesk.knowledge-base.new' },
  ],

  /** routes/__sidebar/knowledge-base/[slug]/page.tsx */
  'knowledge-base.article': (params: { slug: string; title: string }) => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { label: params.title },
  ],

  /** routes/__sidebar/knowledge-base/[slug]/edit/page.tsx */
  'knowledge-base.article.edit': (params: { slug: string; title: string }) => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { label: params.title, href: `/knowledge-base/${params.slug}` },
    { labelKey: 'helpdesk.knowledge-base.edit' },
  ],

  /** routes/__sidebar/knowledge-base/category/[categorySlug]/page.tsx */
  'knowledge-base.category': (params: {
    categorySlug: string;
    categoryName: string;
  }) => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { label: params.categoryName },
  ],

  /** routes/__sidebar/knowledge-base/search/page.tsx */
  'knowledge-base.search': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { labelKey: 'helpdesk.knowledge-base.search' },
  ],

  /** routes/__sidebar/knowledge-base/settings/page.tsx */
  'knowledge-base.settings': () => [
    { labelKey: 'helpdesk' },
    { labelKey: 'helpdesk.knowledge-base', href: '/knowledge-base' },
    { labelKey: 'helpdesk.knowledge-base.settings' },
  ],

  // -------------------------------------------------------------------------
  // Principal-scoped routes  /principal/[principalId]/...
  //
  // `principalName` is the tenant/principal display name resolved async.
  // Use PendingCrumb sentinel while loading:
  //   import { PendingCrumb } from '@brainforgeau/components/page';
  //   breadcrumbsParams={{ principalId, principalName: isLoading ? PendingCrumb : name }}
  // -------------------------------------------------------------------------

  /** routes/principal/[principalId]/page.tsx — principal overview */
  'principal.overview': (params: {
    principalId: string;
    principalName: string;
  }) => [{ labelKey: 'helpdesk' }, { label: params.principalName }],

  /** routes/principal/[principalId]/tickets/page.tsx */
  'principal.tickets.list': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.tickets',
      href: `/principal/${params.principalId}/tickets`,
    },
  ],

  /** routes/principal/[principalId]/tickets/new/page.tsx */
  'principal.tickets.new': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.tickets',
      href: `/principal/${params.principalId}/tickets`,
    },
    { labelKey: 'helpdesk.tickets.new' },
  ],

  /** routes/principal/[principalId]/tickets/[ticketId]/page.tsx */
  'principal.tickets.detail': (params: {
    principalId: string;
    principalName: string;
    ticketId: string;
    subject: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.tickets',
      href: `/principal/${params.principalId}/tickets`,
    },
    { label: params.subject },
  ],

  /** routes/principal/[principalId]/approvals/page.tsx */
  'principal.approvals.list': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.approvals',
      href: `/principal/${params.principalId}/approvals`,
    },
  ],

  /** routes/principal/[principalId]/approvals/new/page.tsx */
  'principal.approvals.new': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.approvals',
      href: `/principal/${params.principalId}/approvals`,
    },
    { labelKey: 'helpdesk.approvals.new' },
  ],

  /** routes/principal/[principalId]/approvals/[id]/page.tsx */
  'principal.approvals.detail': (params: {
    principalId: string;
    principalName: string;
    id: string;
    name: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.approvals',
      href: `/principal/${params.principalId}/approvals`,
    },
    { label: params.name },
  ],

  /** routes/principal/[principalId]/categories/page.tsx */
  'principal.categories.list': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.configuration.categories',
      href: `/principal/${params.principalId}/categories`,
    },
  ],

  /** routes/principal/[principalId]/categories/new/page.tsx */
  'principal.categories.new': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.configuration.categories',
      href: `/principal/${params.principalId}/categories`,
    },
    { labelKey: 'helpdesk.configuration.categories.new' },
  ],

  /** routes/principal/[principalId]/categories/[id]/page.tsx */
  'principal.categories.detail': (params: {
    principalId: string;
    principalName: string;
    id: string;
    name: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.configuration.categories',
      href: `/principal/${params.principalId}/categories`,
    },
    { label: params.name },
  ],

  /** routes/principal/[principalId]/sla-policies/page.tsx — "SLA" is an acronym */
  'principal.sla-policies.list': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      label: 'SLA Policies',
      href: `/principal/${params.principalId}/sla-policies`,
    },
  ],

  /** routes/principal/[principalId]/sla-policies/new/page.tsx */
  'principal.sla-policies.new': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      label: 'SLA Policies',
      href: `/principal/${params.principalId}/sla-policies`,
    },
    { label: 'New SLA Policy' },
  ],

  /** routes/principal/[principalId]/sla-policies/[id]/page.tsx */
  'principal.sla-policies.detail': (params: {
    principalId: string;
    principalName: string;
    id: string;
    name: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      label: 'SLA Policies',
      href: `/principal/${params.principalId}/sla-policies`,
    },
    { label: params.name },
  ],

  /** routes/principal/[principalId]/workflows/page.tsx */
  'principal.workflows.list': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.configuration.workflows',
      href: `/principal/${params.principalId}/workflows`,
    },
  ],

  /** routes/principal/[principalId]/workflows/[id]/page.tsx */
  'principal.workflows.detail': (params: {
    principalId: string;
    principalName: string;
    id: string;
    name: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.configuration.workflows',
      href: `/principal/${params.principalId}/workflows`,
    },
    { label: params.name },
  ],

  /** routes/principal/[principalId]/automations/page.tsx */
  'principal.automations.list': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.configuration.automations',
      href: `/principal/${params.principalId}/automations`,
    },
  ],

  /** routes/principal/[principalId]/automations/[projectId]/page.tsx */
  'principal.automations.project': (params: {
    principalId: string;
    principalName: string;
    projectId: string;
    projectName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.configuration.automations',
      href: `/principal/${params.principalId}/automations`,
    },
    { label: params.projectName },
  ],

  /** routes/principal/[principalId]/automations/[projectId]/rules/[ruleId]/page.tsx */
  'principal.automations.rule': (params: {
    principalId: string;
    principalName: string;
    projectId: string;
    projectName: string;
    ruleId: string;
    ruleName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    {
      labelKey: 'helpdesk.configuration.automations',
      href: `/principal/${params.principalId}/automations`,
    },
    {
      label: params.projectName,
      href: `/principal/${params.principalId}/automations/${params.projectId}`,
    },
    { label: params.ruleName },
  ],

  /** routes/principal/[principalId]/reports/page.tsx */
  'principal.reports': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    { labelKey: 'helpdesk.reports' },
  ],

  /** routes/principal/[principalId]/settings/page.tsx */
  'principal.settings': (params: {
    principalId: string;
    principalName: string;
  }) => [
    { labelKey: 'helpdesk' },
    {
      label: params.principalName,
      href: `/principal/${params.principalId}`,
    },
    { labelKey: 'helpdesk.settings' },
  ],
} satisfies BreadcrumbRegistry;

export type BreadcrumbKey = keyof typeof breadcrumbs;
