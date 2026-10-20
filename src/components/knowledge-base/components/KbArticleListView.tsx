import { selectedContextAtom } from '@/state/auth-atoms';
import { requireIdentityApiBaseUrl } from '@/state/config';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { KnowledgeBaseArticleListDto } from '@/types';
import { KnowledgeBaseStatus } from '@/types';
import {
  toBulkScopeSaveResult,
  toHelpdeskScopePatch,
  toWireMeta,
} from '@/utils/scopeMeta';
import { SCOPE_TESTING_BYPASS_SINGLE_ORG } from '@/utils/scopeTestingBypass';
import { BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BulkScopeEditor } from '@brainforgeau/components/bulk-scope-editor';
import { ListScopeStrip } from '@brainforgeau/components/list-scope-strip';
import { EmptyState } from '@brainforgeau/components/page';
import { useScopeList } from '@brainforgeau/components/scope-list';
import { formatDateTime } from '@brainforgeau/components/utils';
import { ScopeApi } from '@brainforgeau/helpdesk-client';
import {
  PlatformPermissions,
  useAccessScope,
  usePermissions,
  useTimezone,
} from '@brainforgeau/security';
import { Chip } from '@heroui/react';
import { Link } from '@modern-js/runtime/router';
import {
  type ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

type KbArticleListViewProps = {
  articles: KnowledgeBaseArticleListDto[];
  categories: { id: string; name: string; articleCount: number }[];
  isLoading?: boolean;
  /** Re-fetches the article list -- awaited by `useScopeList` before a bulk scope save resolves. */
  refetch: () => Promise<unknown>;
};

const getStatusColor = (
  status: KnowledgeBaseStatus,
): 'default' | 'success' | 'warning' => {
  switch (status) {
    case KnowledgeBaseStatus.Published:
      return 'success';
    case KnowledgeBaseStatus.Draft:
      return 'warning';
    case KnowledgeBaseStatus.Archived:
      return 'default';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: KnowledgeBaseStatus): string => {
  switch (status) {
    case KnowledgeBaseStatus.Published:
      return 'Published';
    case KnowledgeBaseStatus.Draft:
      return 'Draft';
    case KnowledgeBaseStatus.Archived:
      return 'Archived';
    default:
      return 'Unknown';
  }
};

const columnHelper = createColumnHelper<KnowledgeBaseArticleListDto>();

export function KbArticleListView({
  articles,
  categories,
  isLoading,
  refetch,
}: KbArticleListViewProps) {
  const timezone = useTimezone();

  // DTO tenancy/scope metadata initiative -- see useAccessScope for why this
  // isn't @brainforgeau/security's useHierarchicalContext. This component
  // (unlike the `<ListPage>`-templated config-entity list pages) owns its
  // own `useReactTable`/`<BaseTable>` call directly, so it gets the full
  // `tableProps.rowMarker`/`selectionColumn` treatment (per-row border +
  // real checkbox multi-select), same as asset-mf's/hr-mf's raw `<BaseTable>`
  // usage -- not just the "Change all N" banner action.
  const selectedContext = useAtomValue(selectedContextAtom);
  const { accessScope, organisationCount } = useAccessScope(
    selectedContext?.tenantId,
    { identityBaseUrl: requireIdentityApiBaseUrl() },
  );
  const { hasPlatformPermission } = usePermissions();
  const canManageScope = hasPlatformPermission(
    PlatformPermissions.Scope.Manage,
  );

  const scope = useScopeList({
    rows: articles,
    getMeta: row => toWireMeta(row.meta),
    getRecordId: row => row.id ?? row.slug,
    getRecordLabel: row => row.title,
    accessScope,
    selectedContext,
    canManageScope,
    canViewScope: hasPlatformPermission(PlatformPermissions.Scope.Read),
    // entityType verified against helpdesk-backend's `HelpdeskDbContext`
    // (`DbSet<KbArticle> KbArticles`).
    patchScope: async (ids, patch) => {
      const client = await createHelpdeskApiClient(ScopeApi);
      const response = await client.v1ScopeEntityTypePatch('KbArticle', {
        ids,
        patch: toHelpdeskScopePatch(patch),
      });
      return toBulkScopeSaveResult(response.data);
    },
    refetch,
    // REVIEW: TEMPORARY -- see SCOPE_TESTING_BYPASS_SINGLE_ORG's doc comment
    // in scopeTestingBypass.ts. Remove this line to revert.
    bypassSingleOrganisationSuppressionForTesting:
      SCOPE_TESTING_BYPASS_SINGLE_ORG,
    entityLabel: { one: 'article', other: 'articles' },
  });

  const columns = useMemo(
    (): ColumnDef<KnowledgeBaseArticleListDto, any>[] => [
      columnHelper.display({
        id: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <Link
            to={`/knowledge-base/${row.original.slug}`}
            className="text-primary hover:underline font-medium"
          >
            {row.original.title}
          </Link>
        ),
        size: 400,
      }),
      columnHelper.display({
        id: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-sm text-default-600">
            {row.original.categoryName || 'Uncategorized'}
          </span>
        ),
        size: 180,
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Chip size="sm" color={getStatusColor(row.original.status)}>
            {getStatusLabel(row.original.status)}
          </Chip>
        ),
        size: 120,
      }),
      columnHelper.display({
        id: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-sm text-default-500">
            {formatDateTime(row.original.createdAt, { timezone })}
          </span>
        ),
        size: 160,
      }),
    ],
    [timezone],
  );

  const table = useReactTable({
    data: scope.filteredRows,
    columns,
    getRowId: row => row.id ?? row.slug,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
    state: { rowSelection: scope.rowSelection },
    onRowSelectionChange: scope.onRowSelectionChange,
    enableRowSelection: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-default-500">Loading articles...</span>
      </div>
    );
  }

  return (
    // flex-1 + min-h-0 lets this claim the height the page gives it, matching
    // how TicketGrid fills the tickets page. Without it the column is content
    // sized and the table below scrolls inside a few rows' worth of space.
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Out-of-context banner + bulk re-scoping (DTO tenancy/scope metadata
          initiative) -- entirely driven by `useScopeList`. */}
      {scope.bannerProps && (
        <ListScopeStrip {...scope.bannerProps}>
          {scope.isExpanded && scope.editorProps && (
            <BulkScopeEditor {...scope.editorProps} />
          )}
        </ListScopeStrip>
      )}

      {articles.length === 0 ? (
        <EmptyState title="No articles found" live />
      ) : (
        // The scope strip above is fixed height; this takes the remainder so the
        // table's own scroll area ends at the bottom of the viewport.
        <div className="flex min-h-0 flex-1 flex-col">
          <BaseTable
            table={table}
            showInfo={false}
            isLoading={isLoading}
            loading={{ title: 'Loading articles...' }}
            {...scope.tableProps}
          />
        </div>
      )}
    </div>
  );
}
