import { ScopeApi } from '@/api/helpdesk-client';
import { HelpdeskPermissions } from '@/constants/permissions';
import { selectedContextAtom } from '@/state/auth-atoms';
import { requireIdentityApiBaseUrl } from '@/state/config';
import { contextQueryKeyAtom } from '@/state/context-query-key';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { KnowledgeBaseArticleListDto } from '@/types';
import { KnowledgeBaseAccessLevel, KnowledgeBaseStatus } from '@/types';
import { withSortKeys } from '@/utils/listSort';
import {
  toBulkScopeSaveResult,
  toHelpdeskScopePatch,
  toWireMeta,
} from '@/utils/scopeMeta';
import { SCOPE_TESTING_BYPASS_SINGLE_ORG } from '@/utils/scopeTestingBypass';
import { BaseButton, Icon } from '@brainforgeau/components';
import { BulkScopeEditor } from '@brainforgeau/components/bulk-scope-editor';
import {
  BaseDropdown,
  BaseDropdownItem,
  BaseDropdownMenu,
  BaseDropdownPopover,
  BaseDropdownTrigger,
} from '@brainforgeau/components/dropdown';
import {
  ListPage,
  SearchFilter,
  useListPage,
} from '@brainforgeau/components/page';
import { useScopeList } from '@brainforgeau/components/scope-list';
import { formatDateTime } from '@brainforgeau/components/utils';
import {
  PlatformPermissions,
  useAccessScope,
  usePermissions,
  useTimezone,
} from '@brainforgeau/security';
import { Chip } from '@heroui/react';
import { Link, useSearchParams } from '@modern-js/runtime/router';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchKnowledgeBaseArticles,
  useExportKb,
} from '../hooks/useKnowledgeBase';
import { kbSortKeys, kbSortParam } from '../kbListSort';
import { KbImportModal } from './KbImportModal';
import { KbOwnerBadge } from './KbOwnerBadge';
import { NewArticleModal } from './NewArticleModal';

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

/** Shown only when switched on in the Columns menu. */
const INITIAL_VISIBILITY = {
  accessLevel: false,
  publishedAt: false,
  views: false,
  updatedAt: false,
};

const ACCESS_LABELS: Record<KnowledgeBaseAccessLevel, string> = {
  [KnowledgeBaseAccessLevel.Public]: 'Public',
  [KnowledgeBaseAccessLevel.Authenticated]: 'Signed-in users',
  [KnowledgeBaseAccessLevel.TechOnly]: 'Technicians',
  [KnowledgeBaseAccessLevel.AdminOnly]: 'Admins',
};

const columnHelper = createColumnHelper<KnowledgeBaseArticleListDto>();

const ARTICLE_NOUN = { one: 'article', other: 'articles' } as const;

export function KbArticleListView() {
  const timezone = useTimezone();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const exportMutation = useExportKb();

  // Reading needs kb.read; writing, import/export and categories kb.manage,
  // the same split as the route table.
  const { hasPermission, hasPlatformPermission } = usePermissions();
  const canManage = hasPermission(HelpdeskPermissions.KnowledgeBase.Manage);

  // DTO tenancy/scope metadata initiative -- see useAccessScope for why this
  // isn't @brainforgeau/security's useHierarchicalContext.
  const selectedContext = useAtomValue(selectedContextAtom);
  const { accessScope } = useAccessScope(selectedContext?.tenantId, {
    identityBaseUrl: requireIdentityApiBaseUrl(),
  });
  const canManageScope = hasPlatformPermission(
    PlatformPermissions.Scope.Manage,
  );

  // The list's search term (the URL follows it after the debounce), needed
  // before the list exists to switch sorting off while searching.
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') ?? '';
  const searching = searchTerm.trim() !== '';

  const columns = useMemo(
    (): ColumnDef<KnowledgeBaseArticleListDto, any>[] =>
      withSortKeys(
        [
          columnHelper.display({
            id: 'title',
            header: 'Title',
            meta: { label: 'Title' },
            enableHiding: false,
            cell: ({ row }) => (
              <div className="flex items-center gap-2">
                <Link
                  to={`/knowledge-base/${row.original.slug}`}
                  className="text-primary hover:underline font-medium"
                >
                  {row.original.title}
                </Link>
                <KbOwnerBadge article={row.original} />
              </div>
            ),
            size: 400,
          }),
          columnHelper.display({
            id: 'category',
            header: 'Category',
            meta: { label: 'Category' },
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
            meta: { label: 'Status' },
            cell: ({ row }) => (
              <Chip size="sm" color={getStatusColor(row.original.status)}>
                {getStatusLabel(row.original.status)}
              </Chip>
            ),
            size: 120,
          }),
          columnHelper.display({
            id: 'accessLevel',
            header: 'Access',
            meta: { label: 'Access' },
            cell: ({ row }) => (
              <span className="text-sm text-default-600">
                {ACCESS_LABELS[row.original.accessLevel] ??
                  row.original.accessLevel}
              </span>
            ),
            size: 140,
          }),
          columnHelper.display({
            id: 'publishedAt',
            header: 'Published',
            meta: { label: 'Published' },
            cell: ({ row }) => (
              <span className="text-sm text-default-500">
                {row.original.publishedAt
                  ? formatDateTime(row.original.publishedAt, { timezone })
                  : '—'}
              </span>
            ),
            size: 160,
          }),
          columnHelper.display({
            id: 'views',
            header: 'Views',
            meta: { label: 'Views' },
            cell: ({ row }) => (
              <span className="text-sm tabular-nums">{row.original.views}</span>
            ),
            size: 90,
          }),
          columnHelper.display({
            id: 'createdAt',
            header: 'Created',
            meta: { label: 'Created' },
            cell: ({ row }) => (
              <span className="text-sm text-default-500">
                {formatDateTime(row.original.createdAt, { timezone })}
              </span>
            ),
            size: 160,
          }),
          columnHelper.display({
            id: 'updatedAt',
            header: 'Updated',
            meta: { label: 'Updated' },
            cell: ({ row }) => (
              <span className="text-sm text-default-500">
                {formatDateTime(row.original.updatedAt, { timezone })}
              </span>
            ),
            size: 160,
          }),
        ],
        kbSortKeys(searchTerm),
      ) as ColumnDef<KnowledgeBaseArticleListDto, any>[],
    [timezone, searchTerm],
  );

  const list = useListPage<KnowledgeBaseArticleListDto>({
    listId: 'helpdesk.kb-articles',
    // Under the key every article mutation invalidates.
    queryKey: ['knowledge-base', 'articles', contextKey],
    columns,
    search: {},
    getRowId: row => row.id ?? row.slug,
    enableRowSelection: true,
    initialColumnVisibility: INITIAL_VISIBILITY,
    queryFn: ({ pageIndex, pageSize, sorting, search }) =>
      fetchKnowledgeBaseArticles({
        search: search.trim(),
        sort: kbSortParam(sorting, search),
        page: pageIndex + 1,
        pageSize,
      }),
  });

  // A sort picked before searching does not apply to the ranked results.
  const { setSorting } = list.table;
  useEffect(() => {
    if (searching) setSorting([]);
  }, [searching, setSorting]);

  // `useScopeList` owns the Organisation/Division picker options, owner-name
  // resolution, the merge-patch conversion and awaiting `refetch` before a
  // bulk save resolves. Its out-of-context strip is not drawn: its counts and
  // "Show only these" were about the one unpaged page this list used to be.
  const scope = useScopeList({
    rows: list.rows,
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
    refetch: async () => {
      await list.refetch();
    },
    // REVIEW: TEMPORARY -- see SCOPE_TESTING_BYPASS_SINGLE_ORG's doc comment
    // in scopeTestingBypass.ts. Remove this line to revert.
    bypassSingleOrganisationSuppressionForTesting:
      SCOPE_TESTING_BYPASS_SINGLE_ORG,
    entityLabel: ARTICLE_NOUN,
  });

  // The table owns row selection (`useListPage`); the scope editor reads its
  // own copy. Keep the two equal in both directions.
  const { rowSelection: tableSelection } = list.table.getState();
  const { setRowSelection } = list.table;
  useEffect(() => {
    if (!sameSelection(tableSelection, scope.rowSelection)) {
      scope.onRowSelectionChange(tableSelection);
    }
  }, [tableSelection]);
  useEffect(() => {
    if (!sameSelection(tableSelection, scope.rowSelection)) {
      setRowSelection(scope.rowSelection);
    }
  }, [scope.rowSelection]);

  // A shared article's placement belongs to its owner, so it cannot be ticked.
  useEffect(() => {
    const inherited = list.selectedRows.filter(row => row.isInherited);
    if (inherited.length === 0) return;
    setRowSelection(prev => {
      const next = { ...prev };
      for (const row of inherited) delete next[row.id ?? row.slug];
      return next;
    });
  }, [list.selectedRows, setRowSelection]);

  const changeScope = scope.bannerProps?.onChangeScope;

  return (
    <ListPage
      title="Knowledge Base"
      breadcrumbsKey="knowledge-base.list"
      helpKey="helpdesk.knowledge-base"
      description={
        searching ? 'Ranked by relevance while searching' : undefined
      }
      list={list}
      personalise
      countNoun={ARTICLE_NOUN}
      loadError={list.isError ? list.error : undefined}
      onRetry={() => void list.refetch()}
      tableProps={{
        rowMarker: scope.tableProps.rowMarker,
        selectionColumn: scope.tableProps.selectionColumn,
      }}
      bulk={
        changeScope
          ? {
              entityLabel: ARTICLE_NOUN,
              actions: (
                <BaseButton
                  size="xs"
                  variant="bordered"
                  color="light"
                  onPress={changeScope}
                >
                  Change scope
                </BaseButton>
              ),
            }
          : undefined
      }
      subheader={
        scope.isExpanded && scope.editorProps ? (
          <div className="border-l-4 border-l-blue bg-light-2 dark:bg-white/[0.06]">
            <BulkScopeEditor {...scope.editorProps} />
          </div>
        ) : undefined
      }
      filters={
        <SearchFilter
          value={list.search}
          onValueChange={list.setSearch}
          placeholder="Search articles..."
          ariaLabel="Search articles"
        />
      }
      actions={
        canManage ? (
          <>
            <BaseButton
              variant="bordered"
              color="light"
              onPress={() => setIsQuickCreateOpen(true)}
              icon={<Icon name="plus" className="h-4 w-4" />}
            >
              Quick Create
            </BaseButton>
            <Link to="/knowledge-base/new">
              <BaseButton
                color="primary"
                icon={<Icon name="plus" className="h-4 w-4" />}
              >
                Create Article
              </BaseButton>
            </Link>
            <BaseDropdown>
              <BaseDropdownTrigger
                aria-label="Knowledge base actions"
                className="border-light text-gray hover:bg-light-blue hover:text-blue focus:ring-blue flex items-center justify-center rounded-md border transition-colors focus:outline-none focus:ring-2 h-9 w-9"
              >
                <Icon name="dotsV" className="h-4 w-4" />
              </BaseDropdownTrigger>
              <BaseDropdownPopover>
                <BaseDropdownMenu aria-label="Knowledge base actions">
                  <BaseDropdownItem
                    key="import"
                    id="import"
                    onPress={() => setIsImportOpen(true)}
                  >
                    Import
                  </BaseDropdownItem>
                  <BaseDropdownItem
                    key="export"
                    id="export"
                    onPress={() => exportMutation.mutate()}
                  >
                    {exportMutation.isPending ? 'Exporting...' : 'Export'}
                  </BaseDropdownItem>
                  <BaseDropdownItem
                    key="categories"
                    id="categories"
                    href="/knowledge-base/settings"
                  >
                    Manage Categories
                  </BaseDropdownItem>
                </BaseDropdownMenu>
              </BaseDropdownPopover>
            </BaseDropdown>
          </>
        ) : undefined
      }
      modals={
        <>
          <NewArticleModal
            isOpen={isQuickCreateOpen}
            onClose={() => setIsQuickCreateOpen(false)}
          />
          <KbImportModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
          />
        </>
      }
    />
  );
}

const sameSelection = (
  a: Record<string, boolean>,
  b: Record<string, boolean>,
): boolean => {
  const ak = Object.keys(a).filter(k => a[k]);
  const bk = Object.keys(b).filter(k => b[k]);
  return ak.length === bk.length && ak.every(k => b[k]);
};
